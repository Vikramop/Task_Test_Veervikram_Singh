const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BLXToken', function () {
  let blx, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const BLXToken = await ethers.getContractFactory('BLXToken');

    // Deploy contract and wait for deployment transaction to be mined
    const deployTx = await BLXToken.deploy(1000000n);
    blx = await deployTx.waitForDeployment();
  });

  it('Should assign the initial supply to the owner', async function () {
    const ownerBalance = await blx.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseUnits('1000000', 18));
  });

  it('Should allow transfer within maxTxAmount', async function () {
    const amount = ethers.parseUnits('5000', 18); // 5,000 tokens
    await blx.transfer(addr1.address, amount);
    expect(await blx.balanceOf(addr1.address)).to.equal(amount);
  });

  it('Should revert transfer exceeding maxTxAmount', async function () {
    const amount = ethers.parseUnits('20000', 18);
    await expect(blx.transfer(addr1.address, amount)).to.be.revertedWith(
      'BLX: Transfer amount exceeds maxTxAmount'
    );
  });

  it('Non-owner should be subject to cooldown between transfers', async function () {
    const amount = ethers.parseUnits('5000', 18);

    // Transfer tokens from owner to non-owner first (to fund non-owner)
    await blx.connect(owner).transfer(addr1.address, amount);

    // First transfer from non-owner should succeed
    await blx
      .connect(addr1)
      .transfer(addr2.address, ethers.parseUnits('1000', 18));

    // Immediate second transfer from non-owner should revert due to cooldown
    await expect(
      blx.connect(addr1).transfer(addr2.address, ethers.parseUnits('1000', 18))
    ).to.be.revertedWith('BLX: Please wait before making another transaction');
  });

  it('Owner can mint tokens', async function () {
    const mintAmount = ethers.parseUnits('1000', 18);
    await blx.mint(addr1.address, mintAmount);
    expect(await blx.balanceOf(addr1.address)).to.equal(mintAmount);
  });

  it('Non-owner cannot mint tokens', async function () {
    const mintAmount = ethers.parseUnits('1000', 18);
    await expect(blx.connect(addr1).mint(addr1.address, mintAmount)).to.be
      .reverted; // no message check due to custom error
  });

  it('Users can burn their tokens', async function () {
    const burnAmount = ethers.parseUnits('1000', 18);
    await blx.transfer(addr1.address, burnAmount);
    await blx.connect(addr1).burn(burnAmount);
    expect(await blx.balanceOf(addr1.address)).to.equal(0);
  });
});
