const { ethers } = require("hardhat");
const { expect } = require("chai");
const { mine } = require("./helpers/evm");
const { tokenAmount } = require("./helpers/ethers");

const INITIAL_REWARD_PER_BLOCK = tokenAmount(100);
const START_BLOCK = 32;

const mineToStartBlock = async () => {
    await mine(START_BLOCK - (await ethers.provider.getBlockNumber()) - 1);
};

const rewardPool0 = (amount, multiplier = 1) => amount.mul(multiplier).div(10);
const rewardPool1 = (amount, multiplier = 1, winningBonus = 0) =>
  amount.mul(multiplier).mul(9).div(10).sub(winningBonus);

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, delegate, alice, bob, carol] = signers;

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const poolToken = await MockERC20.deploy();
    await mine();
    await poolToken.mint(alice.address, tokenAmount(1000));
    await poolToken.mint(bob.address, tokenAmount(1000));
    await poolToken.mint(carol.address, tokenAmount(1000));

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const maidCoin = await MaidCoin.deploy();
    await mine();

    const TheMaster = await ethers.getContractFactory("TheMaster");
    const theMaster = await TheMaster.deploy(INITIAL_REWARD_PER_BLOCK, 4000000, START_BLOCK, maidCoin.address);
    await mine();

    await poolToken.connect(alice).approve(theMaster.address, ethers.constants.MaxUint256);
    await poolToken.connect(bob).approve(theMaster.address, ethers.constants.MaxUint256);
    await poolToken.connect(carol).approve(theMaster.address, ethers.constants.MaxUint256);
    await maidCoin.transferOwnership(theMaster.address);
    await theMaster.add(poolToken.address, false, 10);
    await theMaster.add(delegate.address, true, 90);

    await mine();

    return {
        deployer,
        delegate,
        alice,
        bob,
        carol,
        poolToken,
        maidCoin,
        theMaster,
    };
};

describe("TheMaster", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("should allow emergency withdraw", async function () {
        const { alice, poolToken, theMaster } = await setupTest();

        await mineToStartBlock();

        await theMaster.connect(alice).deposit(0, tokenAmount(100), alice.address);
        await mine();
        expect(await poolToken.balanceOf(alice.address)).to.equal(tokenAmount(900));

        await theMaster.connect(alice).emergencyWithdraw(0);
        await mine();

        expect(await poolToken.balanceOf(alice.address)).to.equal(tokenAmount(1000));
    });

    it("should reward correctly for pool 0", async function () {
        const { alice, theMaster } = await setupTest();

        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0);

        await mineToStartBlock(); //31
        await mine(3); //34
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //34

        await mine(5); //39
        await theMaster.connect(alice).deposit(0, tokenAmount(100), alice.address); //40 update
        await mine(); //40
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //40

        await mine(); //41
        const rewardPerBlock = await theMaster.rewardPerBlock();
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock)); //41

        await mine(16); //57
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock, 17)); //57
    });

    it.only("should reward correctly for pool 0 (alice & bob)", async function () {
        const { alice, bob, theMaster, maidCoin } = await setupTest();

        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0);

        await mineToStartBlock(); //31
        await mine(3); //34
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //34

        await mine(5); //39
        await theMaster.connect(alice).deposit(0, tokenAmount(100), alice.address); //40 update
        
        await mine(5); //44
        await theMaster.connect(bob).deposit(0, tokenAmount(100), bob.address); //45 update
        
        await mine(); //45
        await theMaster.connect(alice).withdraw(0, tokenAmount(100), alice.address); //46 update

        await mine(); //46
        const rewardPerBlock = await theMaster.rewardPerBlock();
        // expect(await maidCoin.balanceOf(alice.address)).to.equal(rewardPool0(rewardPerBlock, 5));
        // expect(await maidCoin.balanceOf(bob.address)).to.equal(rewardPool0(rewardPerBlock, 5));
    });

    it("should reward correctly for pool 0 and 1", async function () {
        const { delegate, alice, theMaster } = await setupTest();

        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0);
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(0);

        await mineToStartBlock(); //31
        await mine(3); //34
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //34
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(0); //34

        await mine(5); //39
        await theMaster.connect(alice).deposit(0, tokenAmount(100), alice.address); //40 update
        await mine(); //40
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //40
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(0); //40

        await mine(); //41
        const rewardPerBlock = await theMaster.rewardPerBlock();
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock)); //41
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(0); //41

        await theMaster.connect(delegate).deposit(1, tokenAmount(100), alice.address); //41 update
        await mine(16); //57
        const winningBonus = await theMaster.winningBonus();
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock, 17)); //57
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock, 17)); //57
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(
          rewardPool1(rewardPerBlock, 15, winningBonus)
        ); //57

        await mine(7); //64
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(rewardPool0(rewardPerBlock, 24)); //64
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(
          rewardPool1(rewardPerBlock, 22, winningBonus)
        ); //64
    });

    it("should distribute winningBonus correctly", async function () {
        const { delegate, alice, theMaster, maidCoin } = await setupTest();

        await mineToStartBlock(); //31
        await mine(3); //34
        expect(await theMaster.pendingReward(0, alice.address)).to.be.equal(0); //34
        expect(await theMaster.pendingReward(1, alice.address)).to.be.equal(0); //34

        await mine(5); //39
        await theMaster.connect(alice).deposit(0, tokenAmount(100), alice.address); //40 update
        await mine(10); //49
        await theMaster.connect(delegate).deposit(1, tokenAmount(100), alice.address); //50 update
        await mine(); //50
        const winningBonus = await theMaster.winningBonus();
        const rewardPerBlock = await theMaster.rewardPerBlock();
        expect(winningBonus).to.be.equal(rewardPool1(rewardPerBlock, 50 - START_BLOCK)); //50

        for (let i = 0; i < 30; i++) {
            console.log(i);
            await theMaster.connect(delegate).claimWinningBonus(i);
            await mine();
            expect(await maidCoin.balanceOf(delegate.address)).to.equal(winningBonus.div(30).mul(i + 1));
        }
    });
});
