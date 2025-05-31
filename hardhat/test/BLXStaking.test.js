const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BLXStaking', function () {
  let blxToken, rewardToken, staking;
  let owner, user1, user2;

  const initialSupply = ethers.parseEther('1000000');
  const stakeAmount = ethers.parseEther('1000');

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock BLX token (ERC20)
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    blxToken = await ERC20Mock.deploy('BLX Token', 'BLX', initialSupply);
    // await blxToken.deployed();

    // Deploy mock reward token (ERC20)
    rewardToken = await ERC20Mock.deploy('Reward Token', 'RWD', initialSupply);
    // await rewardToken.deployed();

    // Deploy staking contract
    const BLXStaking = await ethers.getContractFactory('BLXStaking');
    staking = await BLXStaking.deploy(blxToken.target, rewardToken.target);
    // await staking.deployed();

    // Transfer some BLX to user1 and user2 for staking
    await blxToken.transfer(user1.address, stakeAmount);
    await blxToken.transfer(user2.address, stakeAmount);

    // User1 and User2 approve staking contract to spend BLX tokens
    await blxToken.connect(user1).approve(staking.target, stakeAmount);
    await blxToken.connect(user2).approve(staking.target, stakeAmount);

    // Owner funds staking contract with reward tokens
    await rewardToken.transfer(staking.target, ethers.parseEther('100000'));
  });

  describe('Staking', function () {
    it('should allow users to stake BLX tokens', async function () {
      await blxToken.connect(user1).approve(staking.target, stakeAmount);
      await expect(staking.connect(user1).stake(stakeAmount))
        .to.emit(staking, 'Staked')
        .withArgs(user1.address, stakeAmount);

      const stakeInfo = await staking.stakes(user1.address);

      expect(stakeInfo.amount).to.equal(stakeAmount);

      expect(await staking.totalStaked()).to.equal(stakeAmount);
    });

    it('should not allow staking zero tokens', async function () {
      await blxToken.connect(user1).approve(staking.target, 0);
      await expect(staking.connect(user1).stake(0)).to.be.revertedWith(
        'Cannot stake zero'
      );
    });
  });

  describe('Unstaking', function () {
    beforeEach(async function () {
      await blxToken.connect(user1).approve(staking.target, stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
    });

    it('should allow unstaking after minimum duration without penalty', async function () {
      // Increase time by 31 days to avoid penalty
      await ethers.provider.send('evm_increaseTime', [31 * 24 * 3600]);
      await ethers.provider.send('evm_mine');

      const initialBalance = await blxToken.balanceOf(user1.address);
      //   console.log('initialbal', initialBalance);+

      await expect(staking.connect(user1).unstake(stakeAmount))
        .to.emit(staking, 'Unstaked')
        .withArgs(user1.address, stakeAmount, 0);

      const finalBalance = await blxToken.balanceOf(user1.address);
      //   console.log('finalbal', finalBalance);

      expect(finalBalance - initialBalance).to.equal(stakeAmount);

      const stakeInfo = await staking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(0);
    });

    it('should apply penalty for early unstaking', async function () {
      // Unstake immediately (less than 30 days)
      const penaltyBps = await staking.earlyWithdrawalPenaltyBps();
      const expectedPenalty =
        (stakeAmount * BigInt(penaltyBps)) / BigInt(10000);
      const expectedReturn = stakeAmount - expectedPenalty;

      const initialBalance = await blxToken.balanceOf(user1.address);

      await expect(staking.connect(user1).unstake(stakeAmount))
        .to.emit(staking, 'Unstaked')
        .withArgs(user1.address, expectedReturn, expectedPenalty);

      const finalBalance = await blxToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(expectedReturn);

      const stakeInfo = await staking.stakes(user1.address);
      expect(stakeInfo.amount).to.equal(0);
    });

    it('should not allow unstaking more than staked', async function () {
      await expect(
        staking.connect(user1).unstake(stakeAmount + 1n)
      ).to.be.revertedWith('Invalid unstake amount');
    });
  });

  describe('Rewards', function () {
    beforeEach(async function () {
      // Transfer tokens to user1 and wait for mining
      await blxToken.transfer(user1.address, stakeAmount);

      // Check balance after transfer (for debugging)
      const balance = await blxToken.balanceOf(user1.address);
      //   console.log('User1 BLX balance before stake:', balance.toString()); // Should be > 0

      // Approve staking contract to spend tokens
      await blxToken.connect(user1).approve(staking.target, stakeAmount);

      // Stake tokens
      await staking.connect(user1).stake(stakeAmount);
    });

    it('should calculate rewards correctly over time', async function () {
      // Increase time by 60 days
      await ethers.provider.send('evm_increaseTime', [60 * 24 * 3600]);
      await ethers.provider.send('evm_mine');

      const pending = await staking.pendingReward(user1.address);
      expect(pending).to.be.gt(0);
    });

    it('should pay rewards on unstake', async function () {
      // Check rewards pending before time increase
      let pending = await staking.pendingReward(user1.address);
      //   console.log('Pending rewards before time increase:', pending.toString());

      // Increase time by 60 days
      await ethers.provider.send('evm_increaseTime', [60 * 24 * 3600]);
      await ethers.provider.send('evm_mine');

      // Check rewards pending after time increase
      pending = await staking.pendingReward(user1.address);
      //   console.log('Pending rewards after time increase:', pending.toString());
      expect(pending).to.be.gt(0);

      const rewardBefore = await rewardToken.balanceOf(user1.address);
      //   console.log('Reward balance before unstake:', rewardBefore.toString());

      // Unstake to claim rewards
      await staking.connect(user1).unstake(stakeAmount);

      const rewardAfter = await rewardToken.balanceOf(user1.address);
      //   console.log('Reward balance after unstake:', rewardAfter.toString());

      expect(rewardAfter).to.be.gt(rewardBefore);
    });
  });

  describe('Admin functions', function () {
    it('should allow owner to set APR tiers', async function () {
      const newTiers = [
        { minDuration: 0, aprBps: 400 },
        { minDuration: 10 * 24 * 3600, aprBps: 600 },
      ];
      await staking.setAPRTiers(newTiers);
      expect((await staking.aprTiers(0)).aprBps).to.equal(400);
      expect((await staking.aprTiers(1)).aprBps).to.equal(600);
    });

    it('should allow owner to set early withdrawal penalty', async function () {
      await staking.setEarlyWithdrawalPenalty(500);
      expect(await staking.earlyWithdrawalPenaltyBps()).to.equal(500);
    });

    it('should revert if non-owner tries to set APR tiers', async function () {
      await expect(staking.connect(user1).setAPRTiers([])).to.be.reverted;
    });
  });
});
