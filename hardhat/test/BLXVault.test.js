const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BLXVault', function () {
  let blxToken, vault, owner, user1, user2;
  const initialSupply = ethers.parseEther('1000000');
  const depositAmount = ethers.parseEther('1000');
  const lockDuration = 60 * 60 * 24 * 7; // 7 days
  const APY_BPS = 1000n;
  const SECONDS_IN_YEAR = 365n * 24n * 60n * 60n;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock BLX token (ERC20 with mint function)
    const BLXToken = await ethers.getContractFactory('BLXToken');
    blxToken = await BLXToken.deploy(initialSupply);

    // Deploy vault contract
    const BLXVault = await ethers.getContractFactory('BLXVault');
    vault = await BLXVault.deploy(
      blxToken.target || (await blxToken.getAddress())
    );

    // Distribute tokens to users
    await blxToken.transfer(user1.address, depositAmount * 10n);
    await blxToken.transfer(user2.address, depositAmount * 10n);
  });

  it('should allow deposit and update user balance', async function () {
    await blxToken
      .connect(user1)
      .approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);

    const depositInfo = await vault.deposits(user1.address);
    expect(depositInfo.amount).to.equal(depositAmount);
    expect(depositInfo.lockUntil).to.be.gt(0);
  });

  it('should accrue rewards over time and auto-compound on interaction', async function () {
    await blxToken
      .connect(user1)
      .approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);

    // Increase time by half a year (approximate)
    await ethers.provider.send('evm_increaseTime', [(60 * 60 * 24 * 365) / 2]);
    await ethers.provider.send('evm_mine');

    // Call deposit again to trigger reward compounding
    await vault.connect(user1).deposit(0, 0);

    const depositInfo = await vault.deposits(user1.address);
    // Expect amount to have increased due to rewards (approx 5% for half year)
    expect(depositInfo.amount).to.be.gt(depositAmount);
  });

  it('should prevent withdrawal before lock expires', async function () {
    await blxToken
      .connect(user1)
      .approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);

    await expect(
      vault.connect(user1).withdraw(depositAmount)
    ).to.be.revertedWith('Tokens are locked');
  });

  it('should allow withdrawal after lock expires', async function () {
    await blxToken
      .connect(user1)
      .approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);

    // Calculate expected rewards and mint them to vault
    const timeElapsed = lockDuration + 1;

    const expectedReward =
      (depositAmount * APY_BPS * BigInt(timeElapsed)) /
      (10000n * SECONDS_IN_YEAR);
    // console.log('expectedReward', expectedReward);

    // await blxToken.connect(owner).mint(await vault.address, expectedReward);
    await blxToken.connect(owner).mint(vault.target, depositAmount);

    // Increase time beyond lock
    await ethers.provider.send('evm_increaseTime', [lockDuration + 1]);
    await ethers.provider.send('evm_mine');

    await expect(vault.connect(user1).withdraw(depositAmount))
      .to.emit(vault, 'Withdrawn')
      .withArgs(user1.address, depositAmount);

    const depositInfo = await vault.deposits(user1.address);
    expect(depositInfo.amount).to.equal(0);
  });

  it('should allow emergency withdrawal ignoring lock and rewards', async function () {
    await blxToken
      .connect(user1)
      .approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);

    // Increase time by some amount but less than lock
    await ethers.provider.send('evm_increaseTime', [lockDuration / 2]);
    await ethers.provider.send('evm_mine');

    await expect(vault.connect(user1).emergencyWithdraw())
      .to.emit(vault, 'EmergencyWithdrawn')
      .withArgs(user1.address, depositAmount);

    const depositInfo = await vault.deposits(user1.address);
    expect(depositInfo.amount).to.equal(0);
  });

  it('should allow admin to pause and unpause contract', async function () {
    await expect(vault.connect(user1).pause()).to.be.reverted; // user1 not admin

    await vault.connect(owner).pause();

    // Expect revert with EnforcedPause custom error
    await expect(
      vault.connect(user1).deposit(depositAmount, lockDuration)
    ).to.be.revertedWithCustomError(vault, 'EnforcedPause');

    await vault.connect(owner).unpause();

    await blxToken.connect(user1).approve(vault.target, depositAmount);
    await vault.connect(user1).deposit(depositAmount, lockDuration);
  });
});
