// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract BLXLiquidityPool is ERC20, ReentrancyGuard, Ownable {
    IERC20 public immutable blxToken;
    IERC20 public immutable pairedToken;

    AggregatorV3Interface public priceFeedBLX;
    AggregatorV3Interface public priceFeedPaired;

    uint256 public reserveBLX;
    uint256 public reservePaired;
    uint256 public reserveETH;

    uint256 public feeRate = 30; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 10000;

    event LiquidityAdded(
        address indexed provider,
        uint256 blxAmount,
        uint256 pairedAmount,
        uint256 lpTokensMinted
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 blxAmount,
        uint256 pairedAmount,
        uint256 lpTokensBurned
    );
    event Swap(
        address indexed trader,
        address inputToken,
        uint256 inputAmount,
        address outputToken,
        uint256 outputAmount
    );
    event FeeRateUpdated(uint256 newFeeRate);

    receive() external payable {}

    constructor(
        address _blxToken,
        address _pairedToken,
        address _priceFeedBLX,
        address _priceFeedPaired
    ) ERC20("BLX LP Token", "BLX-LP") Ownable(msg.sender) {
        blxToken = IERC20(_blxToken);
        pairedToken = IERC20(_pairedToken);
        priceFeedBLX = AggregatorV3Interface(_priceFeedBLX);
        priceFeedPaired = AggregatorV3Interface(_priceFeedPaired);
    }

    // --- Oracle price getters ---

    function getPriceBLX() public view returns (uint256) {
        (, int256 price, , , ) = priceFeedBLX.latestRoundData();
        require(price > 0, "Invalid BLX price");
        return uint256(price) * 1e10;
    }

    function getPricePaired() public view returns (uint256) {
        (, int256 price, , , ) = priceFeedPaired.latestRoundData();
        require(price > 0, "Invalid paired token price");
        return uint256(price) * 1e10;
    }

    // --- Liquidity functions ---

    function addLiquidity(
        uint256 blxAmount
    ) external payable nonReentrant returns (uint256 lpTokensMinted) {
        uint256 ethAmount = msg.value;
        require(blxAmount > 0 && ethAmount > 0, "Must provide liquidity");

        // Transfer BLX tokens from sender
        require(
            blxToken.transferFrom(msg.sender, address(this), blxAmount),
            "BLX transfer failed"
        );

        uint256 totalSupply = totalSupply();

        if (totalSupply == 0) {
            // Initial liquidity provider mints sqrt of product of amounts
            lpTokensMinted = sqrt(blxAmount * ethAmount);
            require(lpTokensMinted > 0, "Insufficient liquidity minted");
        } else {
            // Calculate proportional LP tokens from each token's contribution
            uint256 lpFromBLX = (blxAmount * totalSupply) / reserveBLX;
            uint256 lpFromETH = (ethAmount * totalSupply) / reserveETH;

            // Mint LP tokens based on the smaller contribution to maintain pool ratio
            lpTokensMinted = lpFromBLX < lpFromETH ? lpFromBLX : lpFromETH;
            require(lpTokensMinted > 0, "Insufficient liquidity minted");

            // Calculate the actual amounts of tokens to be added based on lpTokensMinted
            uint256 blxUsed = (lpTokensMinted * reserveBLX) / totalSupply;
            uint256 ethUsed = (lpTokensMinted * reserveETH) / totalSupply;

            // Refund excess BLX tokens to sender if any
            if (blxAmount > blxUsed) {
                uint256 blxRefund = blxAmount - blxUsed;
                require(
                    blxToken.transfer(msg.sender, blxRefund),
                    "BLX refund failed"
                );
                blxAmount = blxUsed;
            }

            // Refund excess ETH to sender if any
            if (ethAmount > ethUsed) {
                uint256 ethRefund = ethAmount - ethUsed;
                (bool success, ) = msg.sender.call{value: ethRefund}("");
                require(success, "ETH refund failed");
                ethAmount = ethUsed;
            }
        }

        // Update reserves with actual amounts used
        reserveBLX += blxAmount;
        reserveETH += ethAmount;

        // Mint LP tokens to liquidity provider
        _mint(msg.sender, lpTokensMinted);

        emit LiquidityAdded(msg.sender, blxAmount, ethAmount, lpTokensMinted);

        return lpTokensMinted;
    }

    function removeLiquidity(
        uint256 lpTokenAmount
    ) external nonReentrant returns (uint256 blxAmount, uint256 ethAmount) {
        require(lpTokenAmount > 0, "Must burn LP tokens");
        uint256 totalSupply = totalSupply();

        blxAmount = (reserveBLX * lpTokenAmount) / totalSupply;
        ethAmount = (reservePaired * lpTokenAmount) / totalSupply;

        require(blxAmount > 0 && ethAmount > 0, "Insufficient amounts");

        _burn(msg.sender, lpTokenAmount);

        reserveBLX -= blxAmount;
        reservePaired -= ethAmount;

        require(
            blxToken.transfer(msg.sender, blxAmount),
            "BLX transfer failed"
        );

        // If paired token is native ETH, send ETH directly
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, blxAmount, ethAmount, lpTokenAmount);

        return (blxAmount, ethAmount);
    }

    // --- Swap function split to avoid stack too deep ---

    struct SwapVars {
        uint256 feeAmount;
        uint256 inputAmountAfterFee;
        uint256 reserveIn;
        uint256 reserveOut;
        uint256 numerator;
        uint256 denominator;
        uint256 outputAmount;
        uint256 oraclePriceIn;
        uint256 oraclePriceOut;
        uint256 oracleRatio;
        uint256 swapPrice;
    }

    function swap(
        address inputToken,
        uint256 inputAmount,
        uint256 minOutputAmount
    ) external payable nonReentrant returns (uint256) {
        require(inputAmount > 0, "Input amount zero");
        require(
            inputToken == address(blxToken) || inputToken == address(0),
            "Invalid input token"
        );

        bool isInputBLX = (inputToken == address(blxToken));
        uint256 ethInputAmount = 0;

        if (isInputBLX) {
            // Input token is BLX (ERC20)
            require(msg.value == 0, "ETH should not be sent when swapping BLX");
            require(
                blxToken.transferFrom(msg.sender, address(this), inputAmount),
                "BLX transfer failed"
            );
        } else {
            // Input token is ETH (native)
            require(msg.value == inputAmount, "ETH amount mismatch");
            ethInputAmount = msg.value;
        }

        uint256 feeAmount = (inputAmount * feeRate) / FEE_DENOMINATOR;
        uint256 inputAmountAfterFee = inputAmount - feeAmount;

        uint256 reserveIn = isInputBLX ? reserveBLX : reservePaired;
        uint256 reserveOut = isInputBLX ? reservePaired : reserveBLX;

        // Calculate output amount using constant product formula
        uint256 numerator = inputAmountAfterFee * reserveOut;
        uint256 denominator = reserveIn + inputAmountAfterFee;
        uint256 outputAmount = numerator / denominator;

        require(outputAmount >= minOutputAmount, "Slippage limit exceeded");
        require(
            outputAmount > 0 && outputAmount < reserveOut,
            "Invalid output amount"
        );

        // Update reserves
        if (isInputBLX) {
            reserveBLX += inputAmount;
            reservePaired -= outputAmount;
        } else {
            reservePaired += inputAmount;
            reserveBLX -= outputAmount;
        }

        // Transfer output tokens
        if (isInputBLX) {
            // Output is ETH, send via call
            (bool success, ) = msg.sender.call{value: outputAmount}("");
            require(success, "ETH transfer failed");
        } else {
            // Output is BLX token
            require(
                blxToken.transfer(msg.sender, outputAmount),
                "BLX transfer failed"
            );
        }

        emit Swap(
            msg.sender,
            inputToken,
            inputAmount,
            isInputBLX ? address(0) : address(blxToken),
            outputAmount
        );

        return outputAmount;
    }

    // --- Owner functions ---

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= 1000, "Fee too high"); // max 10%
        feeRate = newFeeRate;
        emit FeeRateUpdated(newFeeRate);
    }

    // --- Utility ---

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveBLX, reserveETH);
    }
}
