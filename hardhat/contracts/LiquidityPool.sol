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
        return uint256(price) * 1e10; // Adjust decimals (Chainlink usually 8 decimals)
    }

    function getPricePaired() public view returns (uint256) {
        (, int256 price, , , ) = priceFeedPaired.latestRoundData();
        require(price > 0, "Invalid paired token price");
        return uint256(price) * 1e10;
    }

    // --- Liquidity functions ---

    function addLiquidity(
        uint256 blxAmount,
        uint256 pairedAmount
    ) external nonReentrant returns (uint256 lpTokensMinted) {
        require(blxAmount > 0 && pairedAmount > 0, "Must provide liquidity");

        // Validate deposit ratio against oracle price ±5%
        uint256 oracleRatio = (getPriceBLX() * 1e18) / getPricePaired();
        uint256 depositRatio = (blxAmount * 1e18) / pairedAmount;

        require(
            depositRatio >= (oracleRatio * 95) / 100 &&
                depositRatio <= (oracleRatio * 105) / 100,
            "Deposit ratio deviates from oracle price"
        );

        require(
            blxToken.transferFrom(msg.sender, address(this), blxAmount),
            "BLX transfer failed"
        );
        require(
            pairedToken.transferFrom(msg.sender, address(this), pairedAmount),
            "Paired token transfer failed"
        );

        uint256 totalSupply = totalSupply();

        if (totalSupply == 0) {
            lpTokensMinted = sqrt(blxAmount * pairedAmount);
        } else {
            uint256 lpFromBLX = (blxAmount * totalSupply) / reserveBLX;
            uint256 lpFromPaired = (pairedAmount * totalSupply) / reservePaired;
            require(lpFromBLX == lpFromPaired, "Unequal value deposits");
            lpTokensMinted = lpFromBLX;
        }

        require(lpTokensMinted > 0, "Insufficient liquidity minted");

        reserveBLX += blxAmount;
        reservePaired += pairedAmount;

        _mint(msg.sender, lpTokensMinted);

        emit LiquidityAdded(
            msg.sender,
            blxAmount,
            pairedAmount,
            lpTokensMinted
        );
        return lpTokensMinted;
    }

    function removeLiquidity(
        uint256 lpTokenAmount
    ) external nonReentrant returns (uint256 blxAmount, uint256 pairedAmount) {
        require(lpTokenAmount > 0, "Must burn LP tokens");
        uint256 totalSupply = totalSupply();

        blxAmount = (reserveBLX * lpTokenAmount) / totalSupply;
        pairedAmount = (reservePaired * lpTokenAmount) / totalSupply;

        require(blxAmount > 0 && pairedAmount > 0, "Insufficient amounts");

        _burn(msg.sender, lpTokenAmount);

        reserveBLX -= blxAmount;
        reservePaired -= pairedAmount;

        require(
            blxToken.transfer(msg.sender, blxAmount),
            "BLX transfer failed"
        );
        require(
            pairedToken.transfer(msg.sender, pairedAmount),
            "Paired token transfer failed"
        );

        emit LiquidityRemoved(
            msg.sender,
            blxAmount,
            pairedAmount,
            lpTokenAmount
        );
        return (blxAmount, pairedAmount);
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
    ) external nonReentrant returns (uint256) {
        require(inputAmount > 0, "Input amount zero");
        require(
            inputToken == address(blxToken) ||
                inputToken == address(pairedToken),
            "Invalid input token"
        );

        SwapVars memory vars;

        bool isInputBLX = (inputToken == address(blxToken));
        IERC20 tokenIn = isInputBLX ? blxToken : pairedToken;
        IERC20 tokenOut = isInputBLX ? pairedToken : blxToken;

        require(
            tokenIn.transferFrom(msg.sender, address(this), inputAmount),
            "Input token transfer failed"
        );

        vars.feeAmount = (inputAmount * feeRate) / FEE_DENOMINATOR;
        vars.inputAmountAfterFee = inputAmount - vars.feeAmount;

        vars.reserveIn = isInputBLX ? reserveBLX : reservePaired;
        vars.reserveOut = isInputBLX ? reservePaired : reserveBLX;

        // Calculate output amount using constant product formula
        vars.numerator = vars.inputAmountAfterFee * vars.reserveOut;
        vars.denominator = vars.reserveIn + vars.inputAmountAfterFee;
        vars.outputAmount = vars.numerator / vars.denominator;

        require(
            vars.outputAmount >= minOutputAmount,
            "Slippage limit exceeded"
        );
        require(
            vars.outputAmount > 0 && vars.outputAmount < vars.reserveOut,
            "Invalid output amount"
        );

        // Oracle price check ±5%
        vars.oraclePriceIn = isInputBLX ? getPriceBLX() : getPricePaired();
        vars.oraclePriceOut = isInputBLX ? getPricePaired() : getPriceBLX();

        vars.oracleRatio = (vars.oraclePriceIn * 1e18) / vars.oraclePriceOut;
        vars.swapPrice = (vars.inputAmountAfterFee * 1e18) / vars.outputAmount;

        require(
            vars.swapPrice >= (vars.oracleRatio * 95) / 100 &&
                vars.swapPrice <= (vars.oracleRatio * 105) / 100,
            "Swap price deviates from oracle price"
        );

        // Update reserves including fees (fees stay in the pool)
        if (isInputBLX) {
            reserveBLX += inputAmount;
            reservePaired -= vars.outputAmount;
        } else {
            reservePaired += inputAmount;
            reserveBLX -= vars.outputAmount;
        }

        require(
            tokenOut.transfer(msg.sender, vars.outputAmount),
            "Output token transfer failed"
        );

        emit Swap(
            msg.sender,
            inputToken,
            inputAmount,
            address(tokenOut),
            vars.outputAmount
        );
        return vars.outputAmount;
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
        return (reserveBLX, reservePaired);
    }
}
