// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BLXLiquidStaking is ERC20, ReentrancyGuard {
    IERC20 public immutable blxToken;

    // Total BLX tokens staked (including rewards)
    uint256 public totalBLXStaked;

    constructor(address _blxToken) ERC20("Staked BLX", "stBLX") {
        blxToken = IERC20(_blxToken);
    }

    // Stake BLX tokens and mint stBLX
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake zero");

        // Transfer BLX from user to contract
        require(
            blxToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        uint256 stBLXToMint;
        if (totalSupply() == 0 || totalBLXStaked == 0) {
            // Initial mint 1:1
            stBLXToMint = amount;
        } else {
            // Mint proportional to current exchange rate
            stBLXToMint = (amount * totalSupply()) / totalBLXStaked;
        }

        _mint(msg.sender, stBLXToMint);
        totalBLXStaked += amount;
    }

    // Unstake by burning stBLX and redeeming BLX
    function unstake(uint256 stBLXAmount) external nonReentrant {
        require(stBLXAmount > 0, "Cannot unstake zero");
        require(balanceOf(msg.sender) >= stBLXAmount, "Insufficient stBLX");

        // Calculate BLX amount to return based on exchange rate
        uint256 blxAmount = (stBLXAmount * totalBLXStaked) / totalSupply();

        _burn(msg.sender, stBLXAmount);
        totalBLXStaked -= blxAmount;

        require(blxToken.transfer(msg.sender, blxAmount), "Transfer failed");
    }

    // Function to add rewards to the pool, increasing BLX backing stBLX
    // Can be called by owner or reward distributor
    function addRewards(uint256 amount) external {
        require(amount > 0, "No rewards");
        require(
            blxToken.transferFrom(msg.sender, address(this), amount),
            "Reward transfer failed"
        );
        totalBLXStaked += amount;
    }

    // Exchange rate: how much BLX each stBLX token is worth
    function exchangeRate() external view returns (uint256) {
        if (totalSupply() == 0) return 1e18;
        return (totalBLXStaked * 1e18) / totalSupply();
    }
}
