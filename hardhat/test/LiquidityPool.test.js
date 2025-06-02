const { expect } = require('chai');
const { ethers } = require('hardhat');
const artifact = require('../artifacts/contracts/LiquidityPool.sol/BLXLiquidityPool.json');
const { Interface } = require('ethers');

describe('BLXLiquidityPool', function () {
  let blxToken, pairedToken, priceFeedBLX, priceFeedPaired, lpContract;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const BLXToken = await ethers.getContractFactory('BLXToken');
    const initialSupply = 1_000_000; // raw number, your constructor multiplies by decimals
    blxToken = await BLXToken.deploy(initialSupply);

    // Exclude test users from cooldown to avoid revert in tests
    await blxToken.connect(owner).setCooldownExcluded(user1.address, true);
    await blxToken.connect(owner).setCooldownExcluded(user2.address, true);

    // Deploy paired token and price feed mocks as before
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    pairedToken = await ERC20Mock.deploy(
      'Paired Token',
      'PTKN',
      ethers.parseEther('1000000')
    );

    const PriceFeedMock = await ethers.getContractFactory('PriceFeedMock');
    priceFeedBLX = await PriceFeedMock.deploy(ethers.parseUnits('1', 8));
    priceFeedPaired = await PriceFeedMock.deploy(ethers.parseUnits('1', 8));

    // Deploy liquidity pool
    const BLXLiquidityPool = await ethers.getContractFactory(
      'BLXLiquidityPool'
    );
    // console.log('blxToken.target:', blxToken.target);
    // console.log('pairedToken.target:', pairedToken.target);
    // console.log('priceFeedBLX.target:', priceFeedBLX.target);
    // console.log('priceFeedPaired.target:', priceFeedPaired.target);
    lpContract = await BLXLiquidityPool.deploy(
      blxToken.target,
      pairedToken.target,
      priceFeedBLX.target,
      priceFeedPaired.target
    );
    // await lpContract.deployed();

    // Now safe to log
    // console.log(
    //   'lpContract interface functions:',
    //   Object.keys(lpContract.interface.functions)
    // );

    // Transfer tokens to users
    await blxToken.transfer(user1.address, ethers.parseEther('10000'));
    await pairedToken.transfer(user1.address, ethers.parseEther('10000'));
    await blxToken.transfer(user2.address, ethers.parseEther('10000'));
    await pairedToken.transfer(user2.address, ethers.parseEther('10000'));
  });

  it('should allow user to add liquidity and mint LP tokens', async function () {
    const amountBLX = ethers.parseEther('10000');
    const amountPaired = ethers.parseEther('10000');

    await blxToken.connect(user1).approve(lpContract.target, amountBLX);
    await pairedToken.connect(user1).approve(lpContract.target, amountPaired);

    const tx = await lpContract
      .connect(user1)
      .addLiquidity(amountBLX, amountPaired);
    await tx.wait();

    const lpBalance = await lpContract.balanceOf(user1.address);
    // console.log('bal', lpBalance);
    expect(lpBalance).to.be.gt(0);

    const reserves = await lpContract.getReserves();
    expect(reserves[0]).to.equal(amountBLX);
    expect(reserves[1]).to.equal(amountPaired);
  });

  it('should allow user to remove liquidity and burn LP tokens', async function () {
    const amountBLX = ethers.parseEther('1000');
    const amountPaired = ethers.parseEther('1000');

    // Add liquidity first
    await blxToken.connect(user1).approve(lpContract.target, amountBLX);
    await pairedToken.connect(user1).approve(lpContract.target, amountPaired);
    await lpContract.connect(user1).addLiquidity(amountBLX, amountPaired);

    const lpBalance = await lpContract.balanceOf(user1.address);

    // Remove liquidity
    await lpContract.connect(user1).approve(lpContract.target, lpBalance);
    const tx = await lpContract.connect(user1).removeLiquidity(lpBalance);
    const receipt = await tx.wait();

    // LP tokens should be burned
    const lpBalanceAfter = await lpContract.balanceOf(user1.address);
    expect(lpBalanceAfter).to.equal(0);

    // User token balances should increase
    const blxBalance = await blxToken.balanceOf(user1.address);
    const pairedBalance = await pairedToken.balanceOf(user1.address);
    expect(blxBalance).to.be.gte(amountBLX);
    expect(pairedBalance).to.be.gte(amountPaired);
  });

  it('should allow swapping BLX for paired token with correct output', async function () {
    const amountBLX = ethers.parseEther('10000');
    const amountPaired = ethers.parseEther('10000');

    // Approve and add liquidity
    await blxToken.connect(user1).approve(lpContract.target, amountBLX);
    await pairedToken.connect(user1).approve(lpContract.target, amountPaired);
    await lpContract.connect(user1).addLiquidity(amountBLX, amountPaired);

    const swapAmount = ethers.parseEther('10');
    await blxToken.connect(user2).approve(lpContract.target, swapAmount);

    const minOutput = ethers.parseEther('9');

    // Perform the swap transaction
    const tx = await lpContract
      .connect(user2)
      .swap(blxToken.target, swapAmount, minOutput);
    const receipt = await tx.wait();

    // Use Interface from artifact ABI to decode logs
    const iface = new Interface(artifact.abi);

    // Find the Swap event log by parsing logs and matching event name
    const swapLog = receipt.logs.find((log) => {
      try {
        const parsed = iface.parseLog(log);
        return parsed.fragment.name === 'Swap';
      } catch {
        return false;
      }
    });

    if (!swapLog) throw new Error('Swap event log not found');

    const parsedLog = iface.parseLog(swapLog);
    const outputAmount = parsedLog.args.outputAmount;

    // console.log('Swap output amount:', outputAmount.toString());

    const pairedBalanceAfter = await pairedToken.balanceOf(user2.address);
    expect(pairedBalanceAfter).to.be.gte(outputAmount);
  });

  it('should revert swap if slippage is too high', async function () {
    // Setup liquidity pool with initial liquidity
    const amountBLX = ethers.parseEther('1000');
    const amountPaired = ethers.parseEther('1000');
    await blxToken.connect(user1).approve(lpContract.target, amountBLX);
    await pairedToken.connect(user1).approve(lpContract.target, amountPaired);
    await lpContract.connect(user1).addLiquidity(amountBLX, amountPaired);

    // User2 wants to swap BLX for paired token
    const swapAmount = ethers.parseEther('100');
    await blxToken.connect(user2).approve(lpContract.target, swapAmount);

    // Set minOutput higher than possible to trigger revert
    const minOutput = ethers.parseEther('200');

    await expect(
      lpContract.connect(user2).swap(blxToken.target, swapAmount, minOutput)
    ).to.be.revertedWith('Slippage limit exceeded');
  });

  it('should allow owner to update fee rate', async function () {
    const newFeeRate = 50; // 0.5%
    await lpContract.connect(owner).setFeeRate(newFeeRate);
    expect(await lpContract.feeRate()).to.equal(newFeeRate);
  });

  it('should revert fee rate update by non-owner', async function () {
    await expect(
      lpContract.connect(user1).setFeeRate(50)
    ).to.be.revertedWithCustomError(lpContract, 'OwnableUnauthorizedAccount');
  });
});
