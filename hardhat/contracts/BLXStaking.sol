// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BLXStaking is ReentrancyGuard, Ownable {
    IERC20 public immutable blxToken;

    struct StakeInfo {
        uint256 amount; // Amount staked
        uint256 startTimestamp; // When staking started
        uint256 rewardDebt; // Rewards already accounted for
    }

    // APR tiers in basis points (bps), e.g., 500 = 5%
    struct APRTier {
        uint256 minDuration; // minimum staking duration in seconds for this tier
        uint256 aprBps; // APR in basis points
    }

    APRTier[] public aprTiers;

    mapping(address => StakeInfo) public stakes;

    uint256 public totalStaked;

    // Early withdrawal penalty in basis points (e.g., 1000 = 10%)
    uint256 public earlyWithdrawalPenaltyBps = 1000;

    // Reward token (could be BLX or another token)
    IERC20 public rewardToken;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 penalty);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(IERC20 _blxToken, IERC20 _rewardToken) Ownable(msg.sender) {
        blxToken = _blxToken;
        rewardToken = _rewardToken;

        // Example APR tiers setup (can be changed by owner)
        aprTiers.push(APRTier({minDuration: 0, aprBps: 300})); // < 30 days: 3%
        aprTiers.push(APRTier({minDuration: 30 days, aprBps: 500})); // 30-90 days: 5%
        aprTiers.push(APRTier({minDuration: 90 days, aprBps: 800})); // >90 days: 8%
    }

    /// @notice Stake BLX tokens
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake zero");

        StakeInfo storage stakeInfo = stakes[msg.sender];

        // Effects: update state first
        stakeInfo.amount += amount;
        stakeInfo.startTimestamp = block.timestamp;
        stakeInfo.rewardDebt = 0;
        totalStaked += amount;

        // Interaction: pay rewards after state update
        _payReward(msg.sender);

        // Interaction: transfer tokens last
        require(
            blxToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(
            amount > 0 && amount <= stakeInfo.amount,
            "Invalid unstake amount"
        );

        uint256 stakingDuration = block.timestamp - stakeInfo.startTimestamp;
        uint256 penalty = 0;

        if (!_qualifiesForFullReward(stakingDuration)) {
            penalty = (amount * earlyWithdrawalPenaltyBps) / 10000;
        }

        // Calculate reward before state changes
        uint256 reward = pendingReward(msg.sender);

        // Effects: update state variables before external calls
        stakeInfo.amount -= amount;

        if (stakeInfo.amount == 0) {
            stakeInfo.startTimestamp = 0;
        } else {
            stakeInfo.startTimestamp = block.timestamp;
        }

        totalStaked -= amount;

        // Reset rewardDebt before external calls
        stakeInfo.rewardDebt = 0;

        uint256 amountAfterPenalty = amount - penalty;

        // Interactions: external calls last
        if (reward > 0) {
            require(
                rewardToken.transfer(msg.sender, reward),
                "Reward transfer failed"
            );
            emit RewardPaid(msg.sender, reward);
        }

        require(
            blxToken.transfer(msg.sender, amountAfterPenalty),
            "Transfer failed"
        );

        emit Unstaked(msg.sender, amountAfterPenalty, penalty);
    }

    function pendingReward(address user) public view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;

        uint256 stakingDuration = block.timestamp - stakeInfo.startTimestamp;
        uint256 aprBps = _getAPR(stakingDuration);

        uint256 reward = (stakeInfo.amount * aprBps * stakingDuration) /
            (10000 * 365 days);

        return reward;
    }

    /// @notice Owner can set APR tiers
    function setAPRTiers(APRTier[] calldata tiers) external onlyOwner {
        delete aprTiers;
        for (uint256 i = 0; i < tiers.length; i++) {
            aprTiers.push(tiers[i]);
        }
    }

    /// @notice Owner can set early withdrawal penalty
    function setEarlyWithdrawalPenalty(uint256 penaltyBps) external onlyOwner {
        require(penaltyBps <= 10000, "Penalty too high");
        earlyWithdrawalPenaltyBps = penaltyBps;
    }

    /// @dev Internal: Update reward debt for user
    // function _updateReward(address user) internal {
    //     StakeInfo storage stakeInfo = stakes[user];
    //     uint256 reward = pendingReward(user);
    //     if (reward > 0) {
    //         stakeInfo.rewardDebt += reward;
    //     }
    // }

    /// @notice Calculate pending rewards for a user
    function _payReward(address user) internal {
        // StakeInfo storage stakeInfo = stakes[user];
        uint256 reward = pendingReward(user);
        if (reward > 0) {
            require(
                rewardToken.transfer(user, reward),
                "Reward transfer failed"
            );
            emit RewardPaid(user, reward);
        }
    }

    /// @dev Internal: Get APR based on staking duration
    function _getAPR(uint256 duration) internal view returns (uint256) {
        uint256 apr = aprTiers[0].aprBps; // default APR
        for (uint256 i = aprTiers.length; i > 0; i--) {
            if (duration >= aprTiers[i - 1].minDuration) {
                apr = aprTiers[i - 1].aprBps;
                break;
            }
        }
        return apr;
    }

    /// @dev Internal: Check if user qualifies for full rewards (no penalty)
    function _qualifiesForFullReward(
        uint256 duration
    ) internal pure returns (bool) {
        // For example, require minimum 30 days staking for no penalty
        return duration >= 30 days;
    }
}
