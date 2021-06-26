import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import CloneNurseArtifact from "../artifacts/contracts/CloneNurse.sol/CloneNurse.json";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import MockERC20Artifact from "../artifacts/contracts/mock/MockERC20.sol/MockERC20.json";
import TheMasterArtifact from "../artifacts/contracts/TheMaster.sol/TheMaster.json";
import NursePartArtifact from "../artifacts/contracts/NursePart.sol/NursePart.json";
import { CloneNurse, MaidCoin, MockERC20, NursePart, TheMaster } from "../typechain";
import { mine } from "./shared/utils/blockchain";
import { expandTo18Decimals } from "./shared/utils/number";
import { ContractFactory } from "ethers";

const INITIAL_REWARD_PER_BLOCK = expandTo18Decimals(100);
const START_BLOCK = 32;

const mineToStartBlock = async () => {
    await mine(START_BLOCK - (await ethers.provider.getBlockNumber()) - 1);
};

const setupTest = async () => {
    const provider = waffle.provider;
    const [admin, alice, bob, carol, dan] = provider.getWallets();

    await network.provider.send("evm_setAutomine", [false]);

    const poolTokenFactory = new ContractFactory(
        MockERC20Artifact.abi,
        MockERC20Artifact.bytecode,
        admin,
    );
    const poolToken = await poolTokenFactory.deploy() as MockERC20;

    await mine();
    await poolToken.mint(alice.address, expandTo18Decimals(1000));
    await poolToken.mint(bob.address, expandTo18Decimals(1000));
    await poolToken.mint(carol.address, expandTo18Decimals(1000));
    await poolToken.mint(dan.address, expandTo18Decimals(1000));

    const maidCoinFactory = new ContractFactory(
        MaidCoinArtifact.abi,
        MaidCoinArtifact.bytecode,
        admin,
    );
    const maidCoin = await maidCoinFactory.deploy() as MaidCoin;

    await mine();

    const nursePartFactory = new ContractFactory(
        NursePartArtifact.abi,
        NursePartArtifact.bytecode,
        admin,
    );
    const nursePart = await nursePartFactory.deploy() as NursePart;

    await mine();
    await nursePart.mint(alice.address, 1, 10);
    await nursePart.mint(bob.address, 2, 5);
    await nursePart.mint(carol.address, 0, 2);

    const theMasterFactory = new ContractFactory(
        TheMasterArtifact.abi,
        TheMasterArtifact.bytecode,
        admin,
    );
    const theMaster = await theMasterFactory.deploy(
        INITIAL_REWARD_PER_BLOCK, 400000, START_BLOCK, maidCoin.address,
    ) as TheMaster;

    await mine();

    const nurseFactory = new ContractFactory(
        CloneNurseArtifact.abi,
        CloneNurseArtifact.bytecode,
        admin,
    );
    const nurse = await nurseFactory.deploy(
        nursePart.address, maidCoin.address, theMaster.address,
    ) as CloneNurse;

    await mine();

    await nursePart.connect(alice).setApprovalForAll(nurse.address, true);
    await nursePart.connect(bob).setApprovalForAll(nurse.address, true);
    await nursePart.connect(carol).setApprovalForAll(nurse.address, true);

    await poolToken.connect(alice).approve(theMaster.address, ethers.constants.MaxUint256);
    await poolToken.connect(bob).approve(theMaster.address, ethers.constants.MaxUint256);
    await poolToken.connect(carol).approve(theMaster.address, ethers.constants.MaxUint256);
    await poolToken.connect(dan).approve(theMaster.address, ethers.constants.MaxUint256);

    await maidCoin.transferOwnership(theMaster.address);

    await theMaster.add(maidCoin.address, false, false, ethers.constants.AddressZero, 0, 10);
    await theMaster.add(poolToken.address, false, false, ethers.constants.AddressZero, 0, 9);
    await theMaster.add(nurse.address, true, true, ethers.constants.AddressZero, 0, 30);
    await theMaster.add(poolToken.address, false, true, nurse.address, 10, 51);
    await mine();

    return {
        admin,
        alice,
        bob,
        carol,
        dan,
        poolToken,
        maidCoin,
        nursePart,
        theMaster,
        nurse,
    };
};

describe("TheMaster", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    it.only("overall test", async function () {
        const { alice, bob, carol, dan, poolToken, maidCoin, nursePart, theMaster, nurse } = await setupTest();
        await network.provider.send("evm_setAutomine", [true]);

        await nurse.addNurseType(1, 123, 100);
        await nurse.addNurseType(1, 234, 200);
        await nurse.addNurseType(1, 345, 300);

        await nurse.connect(alice).assemble(1);
        await nurse.connect(bob).assemble(2);
        await nurse.connect(carol).assemble(0);
        await nurse.connect(alice).assemble(1);
        await nurse.connect(bob).assemble(2);
        await nurse.connect(carol).assemble(0);
        await nurse.connect(alice).assemble(1);
        await nurse.connect(bob).assemble(2);
        await nurse.connect(alice).assemble(1);
        await nurse.connect(bob).assemble(2);

        expect(await nurse.ownerOf(0)).to.be.equal(alice.address);
        expect(await nurse.ownerOf(1)).to.be.equal(bob.address);
        expect(await nurse.ownerOf(2)).to.be.equal(carol.address);

        await mineToStartBlock();

        await expect(theMaster.connect(dan).deposit(0, 1, 0)).to.be.revertedWith("TheMaster: deposit to your address");
        await expect(theMaster.connect(dan).deposit(1, 1, 0)).to.be.revertedWith("TheMaster: deposit to your address");
        await expect(theMaster.connect(dan).deposit(2, 1, 0)).to.be.revertedWith("TheMaster: Not called by delegate");
        await expect(theMaster.connect(dan).deposit(3, 1, 0)).to.be.revertedWith("TheMaster: use support func");

        await expect(theMaster.connect(dan).support(0, 1, 0)).to.be.revertedWith("TheMaster: use deposit func");
        await expect(theMaster.connect(dan).support(1, 1, 0)).to.be.revertedWith("TheMaster: use deposit func");
        await expect(theMaster.connect(dan).support(2, 1, 0)).to.be.revertedWith("TheMaster: use deposit func");

        await theMaster.connect(dan).support(3, 1, 1);
        expect(await nurse.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurse.supportedPower(1)).to.be.equal(1);

        for (let i = 0; i < 10; i += 1) {
            expect(await nurse.supportingRoute(i)).to.be.equal(i);
        }

        await theMaster.connect(dan).support(3, 1, 2);
        expect(await nurse.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurse.supportedPower(1)).to.be.equal(2);
        expect(await nurse.supportedPower(2)).to.be.equal(0);

        await mine();
        await mine();
        await mine();
        await mine();

        const toNFT = expandTo18Decimals(255).div(10);
        const toDan = expandTo18Decimals(255).sub(toNFT);
        await expect(() => theMaster.connect(dan).desupport(3, 1)).to.changeTokenBalances(maidCoin, [dan, bob], [toDan, toNFT]);

        const signers = await ethers.getSigners();
        const [a, b, c, d, e, u0, u1, u2, u3, u4, u5, u6, u7, u8, u9] = signers;

        await poolToken.connect(alice).transfer(u0.address, 100);
        await poolToken.connect(alice).transfer(u1.address, 100);
        await poolToken.connect(alice).transfer(u2.address, 100);
        await poolToken.connect(alice).transfer(u3.address, 100);
        await poolToken.connect(alice).transfer(u4.address, 100);
        await poolToken.connect(alice).transfer(u5.address, 100);
        await poolToken.connect(alice).transfer(u6.address, 100);
        await poolToken.connect(alice).transfer(u7.address, 100);
        await poolToken.connect(alice).transfer(u8.address, 100);
        await poolToken.connect(alice).transfer(u9.address, 100);

        await poolToken.connect(u0).approve(theMaster.address, 10000);
        await poolToken.connect(u1).approve(theMaster.address, 10000);
        await poolToken.connect(u2).approve(theMaster.address, 10000);
        await poolToken.connect(u3).approve(theMaster.address, 10000);
        await poolToken.connect(u4).approve(theMaster.address, 10000);
        await poolToken.connect(u5).approve(theMaster.address, 10000);
        await poolToken.connect(u6).approve(theMaster.address, 10000);
        await poolToken.connect(u7).approve(theMaster.address, 10000);
        await poolToken.connect(u8).approve(theMaster.address, 10000);
        await poolToken.connect(u9).approve(theMaster.address, 10000);

        await theMaster.connect(u0).support(3, 2, 2);
        await theMaster.connect(u1).support(3, 3, 3);
        await theMaster.connect(u2).support(3, 4, 4);
        await theMaster.connect(u3).support(3, 5, 5);
        await theMaster.connect(u4).support(3, 6, 6);
        await theMaster.connect(u5).support(3, 7, 7);
        await theMaster.connect(u6).support(3, 8, 8);
        await theMaster.connect(u7).support(3, 9, 9);

        for (let i = 0; i < 10; i += 1) {
            expect(await nurse.supportingRoute(i)).to.be.equal(i);
            expect(await nurse.supportedPower(i)).to.be.equal(i);
        }

        await nurse.connect(alice).destroy(0, 4);
        await nurse.connect(bob).destroy(4, 8);
        expect(await nurse.supportedPower(8)).to.be.equal(12);
        await nurse.connect(alice).destroy(8, 6);
        expect(await nurse.supportedPower(8)).to.be.equal(0);
        expect(await nurse.supportedPower(6)).to.be.equal(18);
        expect(await nurse.supportingRoute(8)).to.be.equal(6);
        expect(await nurse.supportingRoute(6)).to.be.equal(6);

        expect(await nurse.supportingTo(dan.address)).to.be.equal(1);
        expect(await nurse.supportingTo(u0.address)).to.be.equal(2);
        expect(await nurse.supportingTo(u1.address)).to.be.equal(3);
        expect(await nurse.supportingTo(u2.address)).to.be.equal(4);
        expect(await nurse.supportingTo(u3.address)).to.be.equal(5);
        expect(await nurse.supportingTo(u4.address)).to.be.equal(6);
        expect(await nurse.supportingTo(u5.address)).to.be.equal(7);
        expect(await nurse.supportingTo(u6.address)).to.be.equal(8);
        expect(await nurse.supportingTo(u7.address)).to.be.equal(9);

        await theMaster.connect(u2).support(3, 0, 0);
        expect(await nurse.supportingTo(u2.address)).to.be.equal(6);
        // console.log((await nurse.totalRewardsFromSupporters(6)).toString());

        await theMaster.connect(u6).support(3, 0, 0);
        expect(await nurse.supportingTo(u6.address)).to.be.equal(6);
        // console.log((await nurse.totalRewardsFromSupporters(6)).toString());

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

        await theMaster.set(3, 0);
        await theMaster.set(2, 0);
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

        const r1 = await nurse.pendingReward(1);
        const r2 = await nurse.pendingReward(2);
        const r3 = await nurse.pendingReward(3);
        const r5 = await nurse.pendingReward(5);
        const r6 = await nurse.pendingReward(6);
        const r7 = await nurse.pendingReward(7);
        const r9 = await nurse.pendingReward(9);

        await network.provider.send("evm_setAutomine", [true]);

        await expect(() => nurse.connect(bob).claim(1)).to.changeTokenBalance(maidCoin, bob, r1);
        await expect(() => nurse.connect(carol).claim(2)).to.changeTokenBalance(maidCoin, carol, r2);
        await expect(() => nurse.connect(alice).claim(3)).to.changeTokenBalance(maidCoin, alice, r3);
        await expect(() => nurse.connect(carol).claim(5)).to.changeTokenBalance(maidCoin, carol, r5);
        await expect(() => nurse.connect(alice).claim(6)).to.changeTokenBalance(maidCoin, alice, r6);
        await expect(() => nurse.connect(bob).claim(7)).to.changeTokenBalance(maidCoin, bob, r7);
        await expect(() => nurse.connect(bob).claim(9)).to.changeTokenBalance(maidCoin, bob, r9);

        await theMaster.set(3, 51);
        await theMaster.set(2, 30);

        await theMaster.connect(dan).desupport(3, 1);
        expect(await nurse.supportingTo(dan.address)).to.be.equal(1);

        await theMaster.connect(dan).support(3, 1, 2);
        expect(await nurse.supportingTo(dan.address)).to.be.equal(2);
    });
});
