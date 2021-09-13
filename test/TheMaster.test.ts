import { MaidCoin, NursePart, CloneNurses, WETH, MaidCafe, TheMaster, TestLPToken, TestSushiToken } from "../typechain";

import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, BigNumberish, BytesLike, Contract } from "ethers";
import { mine, getBlock, autoMining, mineTo } from "./shared/utils/blockchain";

const { constants } = ethers;
const { AddressZero, HashZero, Zero, MaxUint256 } = constants;

const tokenAmount = (number: number) => {
    return ethers.utils.parseEther(String(number));
};

const INITIAL_REWARD_PER_BLOCK = tokenAmount(1);
const START_BLOCK = 300;

const mineToStartBlock = async () => {
    await mine(START_BLOCK - (await ethers.provider.getBlockNumber()) - 1);
};

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan, erin, frank] = signers;

    await network.provider.send("evm_setAutomine", [false]);

    const TestLPToken = await ethers.getContractFactory("TestLPToken");
    const lpToken = (await TestLPToken.deploy()) as TestLPToken;
    const mockLPToken = (await TestLPToken.deploy()) as TestLPToken;
    await mine();

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const coin = (await MaidCoin.deploy()) as MaidCoin;

    const WETH = await ethers.getContractFactory("WETH");
    const weth = (await WETH.deploy()) as WETH;

    const MaidCafe = await ethers.getContractFactory("MaidCafe");
    const cafe = (await MaidCafe.deploy(coin.address, weth.address)) as MaidCafe;

    const TestSushiToken = await ethers.getContractFactory("TestSushiToken");
    const sushi = (await TestSushiToken.deploy()) as TestSushiToken;
    const TestMasterChef = await ethers.getContractFactory("TestMasterChef");
    const sushiMC = await TestMasterChef.deploy(sushi.address, deployer.address, tokenAmount(100), 0, 0);
    await mine();

    await sushiMC.add(400, mockLPToken, true);
    await sushiMC.add(300, mockLPToken, true);
    await sushiMC.add(200, weth, true);
    await sushiMC.add(100, lpToken, true);
    await mine();

    const NursePart = await ethers.getContractFactory("NursePart");
    const part = (await NursePart.deploy(cafe.address)) as NursePart;

    await mine();

    const TheMaster = await ethers.getContractFactory("TheMaster");
    const theMaster = (await TheMaster.deploy(
        INITIAL_REWARD_PER_BLOCK,
        520000,
        START_BLOCK,
        coin.address,
        lpToken.address,
        sushi.address
    )) as TheMaster;
    await mine();

    const CloneNurses = await ethers.getContractFactory("CloneNurses");
    const nurses = (await CloneNurses.deploy(
        part.address,
        coin.address,
        theMaster.address,
        cafe.address
    )) as CloneNurses;
    await mine();

    for(let i = 1; i< 7; i++) {
        await lpToken.mint(signers[i].address, tokenAmount(10000));
        await part.connect(signers[i]).setApprovalForAll(nurses.address, true);
        await lpToken.connect(signers[i]).approve(theMaster.address, MaxUint256);
        await part.mint(signers[i].address, 0, 100);
        await part.mint(signers[i].address, 1, 100);
        await part.mint(signers[i].address, 2, 100);
        await part.mint(signers[i].address, 3, 100);
    }

    await coin.transferOwnership(theMaster.address);

    await theMaster.add(coin.address, false, false, AddressZero, 0, 10);
    await theMaster.add(lpToken.address, false, false, AddressZero, 0, 9);
    await theMaster.add(nurses.address, true, true, AddressZero, 0, 30);
    await theMaster.add(lpToken.address, false, false, nurses.address, 10, 51);
    await mine();

    return {
        deployer,
        alice,
        bob,
        carol,
        dan,
        erin,
        frank,
        coin,
        sushi,
        sushiMC,
        TheMaster,
        theMaster,
        weth,
        lpToken,
        mockLPToken,
        cafe,
        part,
        nurses,
    };
};

describe("TheMaster", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("overall test_old. no sushi", async function () {
        const { alice, bob, carol, dan, lpToken, coin, part, theMaster, nurses } = await setupTest();
        await network.provider.send("evm_setAutomine", [true]);

        await nurses.addNurseType([2, 2, 2], [123, 234, 345], [100, 200, 300], [1000, 2000, 3000]);

        await nurses.connect(alice).assemble(1,2);
        await nurses.connect(bob).assemble(2,2);
        await nurses.connect(carol).assemble(0,2);
        await nurses.connect(alice).assemble(1,2);
        await nurses.connect(bob).assemble(2,2);
        await nurses.connect(carol).assemble(0,2);
        await nurses.connect(alice).assemble(1,2);
        await nurses.connect(bob).assemble(2,2);
        await nurses.connect(alice).assemble(1,2);
        await nurses.connect(bob).assemble(2,2);

        expect(await nurses.ownerOf(0)).to.be.equal(alice.address);
        expect(await nurses.ownerOf(1)).to.be.equal(bob.address);
        expect(await nurses.ownerOf(2)).to.be.equal(carol.address);

        await mineToStartBlock();

        await expect(theMaster.connect(dan).deposit(0, 1, 0)).to.be.revertedWith("TheMaster: Deposit to your address");
        await expect(theMaster.connect(dan).deposit(1, 1, 0)).to.be.revertedWith("TheMaster: Deposit to your address");
        await expect(theMaster.connect(dan).deposit(2, 1, 0)).to.be.revertedWith("TheMaster: Not called by delegate");
        await expect(theMaster.connect(dan).deposit(3, 1, 0)).to.be.revertedWith("TheMaster: Use support func");

        await expect(theMaster.connect(dan).support(0, 1, 0)).to.be.revertedWith("TheMaster: Use deposit func");
        await expect(theMaster.connect(dan).support(1, 1, 0)).to.be.revertedWith("TheMaster: Use deposit func");
        await expect(theMaster.connect(dan).support(2, 1, 0)).to.be.revertedWith("TheMaster: Use deposit func");

        await theMaster.connect(dan).support(3, 1, 1);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurses.supportedPower(1)).to.be.equal(1);

        for (let i = 0; i < 10; i += 1) {
            expect(await nurses.supportingRoute(i)).to.be.equal(i);
        }

        await theMaster.connect(dan).support(3, 1, 2);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurses.supportedPower(1)).to.be.equal(2);
        expect(await nurses.supportedPower(2)).to.be.equal(0);

        await mine();
        await mine();
        await mine();
        await mine();

        const toNFT = tokenAmount(2.55).div(10);
        const toDan = tokenAmount(2.55).sub(toNFT);
        await expect(() => theMaster.connect(dan).desupport(3, 1)).to.changeTokenBalances(
            coin,
            [dan, bob],
            [toDan, toNFT]
        );

        const signers = await ethers.getSigners();
        const [a, b, c, d, e, u0, u1, u2, u3, u4, u5, u6, u7, u8, u9] = signers;

        await lpToken.connect(alice).transfer(u0.address, 100);
        await lpToken.connect(alice).transfer(u1.address, 100);
        await lpToken.connect(alice).transfer(u2.address, 100);
        await lpToken.connect(alice).transfer(u3.address, 100);
        await lpToken.connect(alice).transfer(u4.address, 100);
        await lpToken.connect(alice).transfer(u5.address, 100);
        await lpToken.connect(alice).transfer(u6.address, 100);
        await lpToken.connect(alice).transfer(u7.address, 100);
        await lpToken.connect(alice).transfer(u8.address, 100);
        await lpToken.connect(alice).transfer(u9.address, 100);

        await lpToken.connect(u0).approve(theMaster.address, 10000);
        await lpToken.connect(u1).approve(theMaster.address, 10000);
        await lpToken.connect(u2).approve(theMaster.address, 10000);
        await lpToken.connect(u3).approve(theMaster.address, 10000);
        await lpToken.connect(u4).approve(theMaster.address, 10000);
        await lpToken.connect(u5).approve(theMaster.address, 10000);
        await lpToken.connect(u6).approve(theMaster.address, 10000);
        await lpToken.connect(u7).approve(theMaster.address, 10000);
        await lpToken.connect(u8).approve(theMaster.address, 10000);
        await lpToken.connect(u9).approve(theMaster.address, 10000);

        await theMaster.connect(u0).support(3, 2, 2);
        await theMaster.connect(u1).support(3, 3, 3);
        await theMaster.connect(u2).support(3, 4, 4);
        await theMaster.connect(u3).support(3, 5, 5);
        await theMaster.connect(u4).support(3, 6, 6);
        await theMaster.connect(u5).support(3, 7, 7);
        await theMaster.connect(u6).support(3, 8, 8);
        await theMaster.connect(u7).support(3, 9, 9);

        for (let i = 0; i < 10; i += 1) {
            expect(await nurses.supportingRoute(i)).to.be.equal(i);
            expect(await nurses.supportedPower(i)).to.be.equal(i);
        }

        await nurses.connect(alice).destroy([0], [4]);
        await nurses.connect(bob).destroy([4], [8]);
        expect(await nurses.supportedPower(8)).to.be.equal(12);
        await nurses.connect(alice).destroy([8], [6]);
        expect(await nurses.supportedPower(8)).to.be.equal(0);
        expect(await nurses.supportedPower(6)).to.be.equal(18);
        expect(await nurses.supportingRoute(8)).to.be.equal(6);
        expect(await nurses.supportingRoute(6)).to.be.equal(6);

        expect(await nurses.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurses.supportingTo(u0.address)).to.be.equal(2);
        expect(await nurses.supportingTo(u1.address)).to.be.equal(3);
        expect(await nurses.supportingTo(u2.address)).to.be.equal(4);
        expect(await nurses.supportingTo(u3.address)).to.be.equal(5);
        expect(await nurses.supportingTo(u4.address)).to.be.equal(6);
        expect(await nurses.supportingTo(u5.address)).to.be.equal(7);
        expect(await nurses.supportingTo(u6.address)).to.be.equal(8);
        expect(await nurses.supportingTo(u7.address)).to.be.equal(9);

        await theMaster.connect(u2).support(3, 0, 0);
        expect(await nurses.supportingTo(u2.address)).to.be.equal(6);
        // console.log((await nurses.totalRewardsFromSupporters(6)).toString());

        await theMaster.connect(u6).support(3, 0, 0);
        expect(await nurses.supportingTo(u6.address)).to.be.equal(6);
        // console.log((await nurses.totalRewardsFromSupporters(6)).toString());

        await network.provider.send("evm_setAutomine", [false]);

        await theMaster.connect(dan).support(3, 0, 0);
        await theMaster.connect(u0).support(3, 0, 0);
        await theMaster.connect(u1).support(3, 0, 0);
        await theMaster.connect(u2).support(3, 0, 0);
        await theMaster.connect(u3).support(3, 0, 0);
        await theMaster.connect(u4).support(3, 0, 0);
        await theMaster.connect(u5).support(3, 0, 0);
        await theMaster.connect(u6).support(3, 0, 0);
        await theMaster.connect(u7).support(3, 0, 0);
        await mine();

        // console.log((await theMaster.pendingReward(3,dan.address)).toString());
        // console.log((await theMaster.pendingReward(3,u0.address)).toString());
        // console.log((await theMaster.pendingReward(3,u1.address)).toString());
        // console.log((await theMaster.pendingReward(3,u2.address)).toString());
        // console.log((await theMaster.pendingReward(3,u3.address)).toString());
        // console.log((await theMaster.pendingReward(3,u4.address)).toString());
        // console.log((await theMaster.pendingReward(3,u5.address)).toString());
        // console.log((await theMaster.pendingReward(3,u6.address)).toString());
        // console.log((await theMaster.pendingReward(3,u7.address)).toString());

        await mine();
        await mine();
        await mine();
        await mine();
        await mine();

        await theMaster.set([3,2], [0,0]);
        await mine();

        // console.log((await theMaster.pendingReward(3,dan.address)).toString());
        // console.log((await theMaster.pendingReward(3,u0.address)).toString());
        // console.log((await theMaster.pendingReward(3,u1.address)).toString());
        // console.log((await theMaster.pendingReward(3,u2.address)).toString());
        // console.log((await theMaster.pendingReward(3,u3.address)).toString());
        // console.log((await theMaster.pendingReward(3,u4.address)).toString());
        // console.log((await theMaster.pendingReward(3,u5.address)).toString());
        // console.log((await theMaster.pendingReward(3,u6.address)).toString());
        // console.log((await theMaster.pendingReward(3,u7.address)).toString());

        const r1 = await nurses.pendingReward(1);
        const r2 = await nurses.pendingReward(2);
        const r3 = await nurses.pendingReward(3);
        const r5 = await nurses.pendingReward(5);
        const r6 = await nurses.pendingReward(6);
        const r7 = await nurses.pendingReward(7);
        const r9 = await nurses.pendingReward(9);

        await network.provider.send("evm_setAutomine", [true]);

        await expect(() => nurses.connect(bob).claim([1])).to.changeTokenBalance(coin, bob, r1);
        await expect(() => nurses.connect(carol).claim([2])).to.changeTokenBalance(coin, carol, r2);
        await expect(() => nurses.connect(alice).claim([3])).to.changeTokenBalance(coin, alice, r3);
        await expect(() => nurses.connect(carol).claim([5])).to.changeTokenBalance(coin, carol, r5);
        await expect(() => nurses.connect(alice).claim([6])).to.changeTokenBalance(coin, alice, r6);
        await expect(() => nurses.connect(bob).claim([7])).to.changeTokenBalance(coin, bob, r7);
        await expect(() => nurses.connect(bob).claim([9])).to.changeTokenBalance(coin, bob, r9);

        await theMaster.set([3,2], [51,30]);

        await theMaster.connect(dan).desupport(3, 1);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(1);

        await theMaster.connect(dan).support(3, 1, 2);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(2);
    });


});
