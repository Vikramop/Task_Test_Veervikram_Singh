// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract BLXVault is ReentrancyGuard, AccessControl, Pausable {
    IERC20 public immutable blxToken;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct DepositInfo {
        uint256 amount;
        uint256 lastUpdate;
        uint256 lockUntil;
    }

    mapping(address => DepositInfo) public deposits;

    uint256 public constant APY_BPS = 1000; // 10% APY in basis points (10000 bps = 100%)
    uint256 public constant SECONDS_IN_YEAR = 365 days;

    event Deposited(address indexed user, uint256 amount, uint256 lockUntil);
    event Withdrawn(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    constructor(IERC20 _blxToken) {
        blxToken = _blxToken;

        // Initialize roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @notice Deposit BLX tokens with optional lock duration
    /// @param amount Amount of BLX to deposit
    /// @param lockDuration Lock duration in seconds
    function deposit(
        uint256 amount,
        uint256 lockDuration
    ) external nonReentrant whenNotPaused {
        require(amount > 0 || lockDuration == 0, "Cannot deposit zero");

        DepositInfo storage userDeposit = deposits[msg.sender];

        // Update rewards before changing amount
        _updateRewards(msg.sender);

        if (amount > 0) {
            require(
                blxToken.transferFrom(msg.sender, address(this), amount),
                "Transfer failed"
            );
            userDeposit.amount += amount;
            if (lockDuration > 0) {
                userDeposit.lockUntil = block.timestamp + lockDuration;
            }
        }

        userDeposit.lastUpdate = block.timestamp;

        emit Deposited(msg.sender, amount, userDeposit.lockUntil);
    }

    /// @notice Withdraw BLX tokens after lock period
    /// @param amount Amount to withdraw
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        DepositInfo storage userDeposit = deposits[msg.sender];
        require(
            amount > 0 && amount <= userDeposit.amount,
            "Invalid withdraw amount"
        );
        require(block.timestamp >= userDeposit.lockUntil, "Tokens are locked");

        uint256 reward = pendingRewards(msg.sender);

        uint256 totalToTransfer = amount + reward;

        // Reset deposit info after withdrawal
        userDeposit.amount -= amount;
        userDeposit.lastUpdate = block.timestamp;

        require(
            blxToken.transfer(msg.sender, totalToTransfer),
            "Transfer failed"
        );

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice View pending rewards for a user
    function pendingRewards(address user) public view returns (uint256) {
        DepositInfo storage userDeposit = deposits[user];
        if (userDeposit.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdate;
        uint256 reward = (userDeposit.amount * APY_BPS * timeElapsed) /
            (10000 * SECONDS_IN_YEAR);

        return reward;
    }

    /// @dev Internal: Update rewards by auto-compounding
    function _updateRewards(address user) internal {
        DepositInfo storage userDeposit = deposits[user];
        uint256 reward = pendingRewards(user);
        if (reward > 0) {
            userDeposit.amount += reward;
        }
        userDeposit.lastUpdate = block.timestamp;
    }

    /// @notice Emergency withdrawal without rewards and ignoring lock
    function emergencyWithdraw() external nonReentrant whenNotPaused {
        DepositInfo storage userDeposit = deposits[msg.sender];
        uint256 amount = userDeposit.amount;
        require(amount > 0, "No funds to withdraw");

        userDeposit.amount = 0;
        userDeposit.lastUpdate = block.timestamp;
        userDeposit.lockUntil = 0;

        require(blxToken.transfer(msg.sender, amount), "Transfer failed");

        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /// @notice Pause contract (admin only)
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause contract (admin only)
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
