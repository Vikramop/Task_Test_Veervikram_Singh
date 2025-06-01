const { ethers, run } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // 1. Deploy BLXToken
  const initialSupply = ethers.parseEther('1000000');
  const BLXToken = await ethers.getContractFactory('BLXToken');
  const blxToken = await BLXToken.deploy(initialSupply);
  await blxToken.waitForDeployment();
  console.log('BLXToken deployed to:', blxToken.target);

  // 2. Deploy PairedToken (mock USDC or similar)
  const PairedToken = await ethers.getContractFactory('BLXToken');
  const pairedToken = await PairedToken.deploy(initialSupply);
  await pairedToken.waitForDeployment();
  console.log('PairedToken deployed to:', pairedToken.target);

  // 3. Deploy PriceFeedMock for BLX token
  const initialPrice = 2000 * 10 ** 8; // e.g. $2000 with 8 decimals
  const PriceFeedMock = await ethers.getContractFactory('PriceFeedMock');
  const priceFeedBLX = await PriceFeedMock.deploy(initialPrice);
  await priceFeedBLX.waitForDeployment();
  console.log('PriceFeedMock (BLX) deployed to:', priceFeedBLX.target);

  // 4. Deploy PriceFeedMock for Paired token
  const priceFeedPaired = await PriceFeedMock.deploy(initialPrice);
  await priceFeedPaired.waitForDeployment();
  console.log('PriceFeedMock (Paired) deployed to:', priceFeedPaired.target);

  // 5. Deploy BLXLiquidityPool
  const BLXLiquidityPool = await ethers.getContractFactory('BLXLiquidityPool');
  const liquidityPool = await BLXLiquidityPool.deploy(
    blxToken.target,
    pairedToken.target,
    priceFeedBLX.target,
    priceFeedPaired.target
  );
  await liquidityPool.waitForDeployment();
  console.log('BLXLiquidityPool deployed to:', liquidityPool.target);

  // 6. Deploy BLXVault
  const BLXVault = await ethers.getContractFactory('BLXVault');
  const vault = await BLXVault.deploy(blxToken.target);
  await vault.waitForDeployment();
  console.log('BLXVault deployed to:', vault.target);

  // 7. Deploy BLXStaking (rewardToken is BLX)
  const BLXStaking = await ethers.getContractFactory('BLXStaking');
  const staking = await BLXStaking.deploy(blxToken.target, blxToken.target);
  await staking.waitForDeployment();
  console.log('BLXStaking deployed to:', staking.target);

  // 8. Deploy BLXLiquidStaking
  const BLXLiquidStaking = await ethers.getContractFactory('BLXLiquidStaking');
  const liquidStaking = await BLXLiquidStaking.deploy(blxToken.target);
  await liquidStaking.waitForDeployment();
  console.log('BLXLiquidStaking deployed to:', liquidStaking.target);

  // Optional: Verify contracts on Etherscan (make sure ETHERSCAN_API_KEY is set)
  try {
    await run('verify:verify', {
      address: blxToken.target,
      constructorArguments: [initialSupply],
    });
    await run('verify:verify', {
      address: pairedToken.target,
      constructorArguments: [initialSupply],
    });
    await run('verify:verify', {
      address: priceFeedBLX.target,
      constructorArguments: [initialPrice],
    });
    await run('verify:verify', {
      address: priceFeedPaired.target,
      constructorArguments: [initialPrice],
    });
    await run('verify:verify', {
      address: liquidityPool.target,
      constructorArguments: [
        blxToken.target,
        pairedToken.target,
        priceFeedBLX.target,
        priceFeedPaired.target,
      ],
    });
    await run('verify:verify', {
      address: vault.target,
      constructorArguments: [blxToken.target],
    });
    await run('verify:verify', {
      address: staking.target,
      constructorArguments: [blxToken.target, blxToken.target],
    });
    await run('verify:verify', {
      address: liquidStaking.target,
      constructorArguments: [blxToken.target],
    });
  } catch (err) {
    console.warn('Verification failed or skipped:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
