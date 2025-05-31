const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BLXLiquidStaking', function () {
  let blxToken, liquidStaking, owner, user1, user2;
  const initialSupply = ethers.parseEther('1000000');
  const stakeAmount = ethers.parseEther('1000');

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock BLX token
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    blxToken = await ERC20Mock.deploy('BLX Token', 'BLX', initialSupply);

    // Get deployed BLX token address
    const blxTokenAddress = await blxToken.getAddress();

    // Deploy liquid staking contract with BLX token address
    const BLXLiquidStaking = await ethers.getContractFactory(
      'BLXLiquidStaking'
    );
    liquidStaking = await BLXLiquidStaking.deploy(blxTokenAddress);

    // Distribute BLX tokens to users
    await blxToken.transfer(user1.address, stakeAmount * 10n);
    await blxToken.transfer(user2.address, stakeAmount * 10n);
  });

  it('should allow user to stake BLX and receive stBLX', async function () {
    await blxToken
      .connect(user1)
      .approve(await liquidStaking.getAddress(), stakeAmount);

    await expect(liquidStaking.connect(user1).stake(stakeAmount))
      .to.emit(liquidStaking, 'Transfer') // ERC20 mint event
      .withArgs(
        '0x0000000000000000000000000000000000000000', // zero address as 'from' for mint
        user1.address, // correct user address
        stakeAmount
      );

    expect(await liquidStaking.balanceOf(user1.address)).to.equal(stakeAmount);
    expect(await liquidStaking.totalSupply()).to.equal(stakeAmount);
  });

  it('should allow user to unstake by burning stBLX and receive BLX', async function () {
    const liquidStakingAddress = await liquidStaking.getAddress();

    await blxToken.connect(user1).approve(liquidStakingAddress, stakeAmount);
    await liquidStaking.connect(user1).stake(stakeAmount);

    const blxBalanceBefore = await blxToken.balanceOf(user1.address);

    await expect(liquidStaking.connect(user1).unstake(stakeAmount))
      .to.emit(liquidStaking, 'Transfer') // ERC20 burn event
      .withArgs(
        user1.address,
        '0x0000000000000000000000000000000000000000',
        stakeAmount
      );

    const blxBalanceAfter = await blxToken.balanceOf(user1.address);

    expect(await liquidStaking.balanceOf(user1.address)).to.equal(0);
    expect(blxBalanceAfter - blxBalanceBefore).to.equal(stakeAmount);
  });

  it('should increase value of stBLX when rewards are added', async function () {
    const liquidStakingAddress = await liquidStaking.getAddress();
    const ownerAddress = owner.address;
    const user1Address = user1.address;

    await blxToken.connect(user1).approve(liquidStakingAddress, stakeAmount);
    await liquidStaking.connect(user1).stake(stakeAmount);

    // Owner adds rewards to the pool
    const rewardAmount = ethers.parseEther('500');
    await blxToken.transfer(ownerAddress, rewardAmount); // Ensure owner has tokens
    await blxToken.connect(owner).approve(liquidStakingAddress, rewardAmount);
    await liquidStaking.connect(owner).addRewards(rewardAmount);

    // Exchange rate should increase
    const exchangeRate = await liquidStaking.exchangeRate();
    expect(exchangeRate).to.be.gt(ethers.parseEther('1'));

    // User1 stakes more and receives stBLX proportional to new rate
    const stakeAmount2 = ethers.parseEther('1000');
    await blxToken.connect(user1).approve(liquidStakingAddress, stakeAmount2);
    await liquidStaking.connect(user1).stake(stakeAmount2);

    // Convert BigNumber results to BigInt for correct arithmetic
    const totalSupplyBefore = await liquidStaking.totalSupply();
    const totalBLXStakedBefore = await liquidStaking.totalBLXStaked();

    await blxToken.connect(user1).approve(liquidStakingAddress, stakeAmount2);
    const tx = await liquidStaking.connect(user1).stake(stakeAmount2);

    const totalSupplyAfter = await liquidStaking.totalSupply();
    const totalBLXStakedAfter = await liquidStaking.totalBLXStaked();

    const mintedStBLX = totalSupplyAfter - totalSupplyBefore;
    const expectedMinted =
      (stakeAmount2 * totalSupplyBefore) / totalBLXStakedBefore;

    expect(mintedStBLX).to.equal(expectedMinted);
    expect(totalBLXStakedAfter).to.equal(totalBLXStakedBefore + stakeAmount2);
  });

  it('should allow transferring stBLX tokens', async function () {
    const liquidStakingAddress = await liquidStaking.getAddress();
    const user1Address = user1.address;
    const user2Address = user2.address;

    await blxToken.connect(user1).approve(liquidStakingAddress, stakeAmount);
    await liquidStaking.connect(user1).stake(stakeAmount);

    await liquidStaking.connect(user1).transfer(user2Address, stakeAmount / 2n);

    expect(await liquidStaking.balanceOf(user1Address)).to.equal(
      stakeAmount / 2n
    );
    expect(await liquidStaking.balanceOf(user2Address)).to.equal(
      stakeAmount / 2n
    );
  });
});
