import {
    Maids,
    MaidCoin,
    NursePart,
    NurseRaid,
    TestLPToken,
    TestRNG,
    WETH,
    MaidCafe,
    TestSushiToken,
    TestMasterChef,
    LingerieGirls,
    SushiGirls,
} from "../typechain";

import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { mine, getBlock, autoMining } from "./shared/utils/blockchain";

const { constants } = ethers;
const { AddressZero, HashZero } = constants;

const tokenAmount = (number: number) => {
    return ethers.utils.parseEther(String(number));
};

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan, erin, frank] = signers;

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const coin = (await MaidCoin.deploy()) as MaidCoin;

    const TestSushiToken = await ethers.getContractFactory("TestSushiToken");
    const sushi = (await TestSushiToken.deploy()) as TestSushiToken;

    const INITIAL_REWARD_PER_BLOCK = tokenAmount(100);

    const TestMasterChef = await ethers.getContractFactory("TestMasterChef");
    const mc = (await TestMasterChef.deploy(
        sushi.address,
        deployer.address,
        INITIAL_REWARD_PER_BLOCK,
        0,
        0
    )) as TestMasterChef;

    const WETH = await ethers.getContractFactory("WETH");
    const weth = (await WETH.deploy()) as WETH;

    const TestLPToken = await ethers.getContractFactory("TestLPToken");
    const lpToken = (await TestLPToken.deploy()) as TestLPToken;

    const MaidCafe = await ethers.getContractFactory("MaidCafe");
    const cafe = (await MaidCafe.deploy(coin.address, weth.address)) as MaidCafe;

    const Maids = await ethers.getContractFactory("Maids");
    const maids = (await Maids.deploy(lpToken.address, sushi.address, cafe.address)) as Maids;

    const lpowers: number[] = [];
    for (let i = 0; i < 30; i++) {
        lpowers.push(i);
    }

    const LingerieGirls = await ethers.getContractFactory("LingerieGirls");
    const lgirls = (await LingerieGirls.deploy(lpToken.address, sushi.address, lpowers)) as LingerieGirls;

    const SushiGirls = await ethers.getContractFactory("SushiGirls");
    const sgirls = (await SushiGirls.deploy(lpToken.address, sushi.address)) as SushiGirls;

    const NursePart = await ethers.getContractFactory("NursePart");
    const part = (await NursePart.deploy(cafe.address)) as NursePart;

    const TestRNG = await ethers.getContractFactory("TestRNG");
    const rng = (await TestRNG.deploy()) as TestRNG;

    const NurseRaid = await ethers.getContractFactory("NurseRaid");
    const raid = (await NurseRaid.deploy(coin.address, cafe.address, part.address, rng.address)) as NurseRaid;
    await part.transferOwnership(raid.address);

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
        TestMasterChef,
        mc,
        weth,
        lpToken,
        cafe,
        maids,
        lgirls,
        sgirls,
        part,
        rng,
        raid,
    };
};

describe("NurseRaid", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("should be that users can participate in several raids at the same time", async () => {
        const { raid, maids, coin, deployer, alice } = await setupTest();

        await raid.approveMaids([maids.address]);
        await maids.mint(1);
        await maids.transferFrom(deployer.address, alice.address, 0);

        await expect(raid.create(10000, 0, 5, 50, 100)).to.emit(raid, "Create").withArgs(0, 10000, 0, 5, 50, 100);
        await expect(raid.create(10000, 0, 5, 50, 100)).to.emit(raid, "Create").withArgs(1, 10000, 0, 5, 50, 100);
        await expect(raid.create(10000, 0, 5, 50, 100)).to.emit(raid, "Create").withArgs(2, 10000, 0, 5, 50, 100);

        {
            await coin.transfer(alice.address, 100000);
            await coin.connect(alice).approve(raid.address, 100000);
            await maids.connect(alice).setApprovalForAll(raid.address, true);
        }

        await expect(() => raid.connect(alice).enter(0, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000);
        await expect(() => raid.connect(alice).enter(1, maids.address, 0)).to.changeTokenBalance(coin, alice, -10000);
        await mine(10);
        await expect(() => raid.connect(alice).enter(2, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000);
    });

    it("should be that users who alreay participated in a raid with a Maids or Maids-like can not enter other raids with her", async () => {
        const { raid, maids, coin, deployer, alice } = await setupTest();

        await raid.approveMaids([maids.address]);
        await maids.mint(1);
        await maids.transferFrom(deployer.address, alice.address, 0);

        await raid.create(10000, 0, 5, 50, 100);
        await raid.create(10000, 0, 5, 50, 100);

        {
            await coin.transfer(alice.address, 100000);
            await coin.connect(alice).approve(raid.address, 100000);
            await maids.connect(alice).setApprovalForAll(raid.address, true);
        }

        expect(await maids.ownerOf(0)).to.be.equal(alice.address);
        await raid.connect(alice).enter(0, maids.address, 0);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);

        await expect(raid.connect(alice).enter(1, maids.address, 0)).to.be.revertedWith(
            "ERC721: transfer of token that is not own"
        );
    });

    it("should be that users who exit from raids before duration is not over can't receive any parts", async () => {
        const { raid, maids, coin, part, deployer, alice, bob } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await raid.create(10000, 0, 5, 50, 100);

        {
            await coin.transfer(alice.address, 100000);
            await coin.transfer(bob.address, 100000);

            await coin.connect(alice).approve(raid.address, 100000);
            await coin.connect(bob).approve(raid.address, 100000);

            await maids.connect(bob).setApprovalForAll(raid.address, true);
        }

        await raid.connect(alice).enter(0, AddressZero, 0);
        await raid.connect(bob).enter(0, maids.address, 0);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);

        await mine(10);
        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.false;

        await expect(raid.connect(alice).exit(0)).to.emit(raid, "Exit").withArgs(alice.address, 0);
        await expect(raid.connect(bob).exit(0)).to.emit(raid, "Exit").withArgs(bob.address, 0);
        expect(await part.balanceOf(alice.address, 0)).to.be.equal(0);
        expect(await part.balanceOf(bob.address, 0)).to.be.equal(0);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
    });

    it("should be that an user who alreay participated in a raid can not re-enter the raid before exiting", async () => {
        const { raid, maids, coin, part, deployer, alice, bob } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await raid.create(10000, 0, 5, 50, 100);

        {
            await coin.transfer(alice.address, 100000);
            await coin.transfer(bob.address, 100000);

            await coin.connect(alice).approve(raid.address, 100000);
            await coin.connect(bob).approve(raid.address, 100000);

            await maids.connect(bob).setApprovalForAll(raid.address, true);
        }

        await expect(() => raid.connect(alice).enter(0, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000);
        await mine(5);
        await expect(raid.connect(alice).enter(0, AddressZero, 0)).to.be.revertedWith("NurseRaid: Raid is in progress");

        await expect(() => raid.connect(bob).enter(0, maids.address, 0)).to.changeTokenBalance(coin, bob, -10000);
        await mine(5);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);
        await expect(raid.connect(bob).enter(0, maids.address, 0)).to.be.revertedWith("NurseRaid: Raid is in progress");

        await mine(50);
        await expect(raid.connect(alice).exit(0)).to.emit(raid, "Exit").withArgs(alice.address, 0);
        await expect(raid.connect(bob).exit(0)).to.emit(raid, "Exit").withArgs(bob.address, 0);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
        expect(await part.balanceOf(alice.address, 0)).to.be.gte(1);
        expect(await part.balanceOf(bob.address, 0)).to.be.gte(1);

        await expect(() => raid.connect(alice).enter(0, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000);
        await expect(() => raid.connect(bob).enter(0, maids.address, 0)).to.changeTokenBalance(coin, bob, -10000);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);
    });

    it("should be that only approved Maids can participate in raids", async () => {
        const { raid, maids, lgirls, sgirls, coin, deployer, alice, bob, carol, dan } = await setupTest();

        await raid.approveMaids([maids.address, lgirls.address]);

        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        expect(await raid.isMaidsApproved(lgirls.address)).to.be.true;
        expect(await raid.isMaidsApproved(sgirls.address)).to.be.false;

        await raid.approveMaids([sgirls.address]);
        expect(await raid.isMaidsApproved(sgirls.address)).to.be.true;
        await raid.disapproveMaids([sgirls.address]);
        expect(await raid.isMaidsApproved(sgirls.address)).to.be.false;

        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);
        await lgirls.transferFrom(deployer.address, carol.address, 0);
        await sgirls.mint(2);
        await sgirls.transferFrom(deployer.address, dan.address, 0);

        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
        expect(await lgirls.ownerOf(0)).to.be.equal(carol.address);
        expect(await sgirls.ownerOf(0)).to.be.equal(dan.address);

        await raid.create(10000, 0, 5, 100, 10000);

        await coin.transfer(alice.address, 10000);
        await coin.transfer(bob.address, 10000);
        await coin.transfer(carol.address, 10000);
        await coin.transfer(dan.address, 10000);

        await coin.connect(alice).approve(raid.address, 10000);
        await coin.connect(bob).approve(raid.address, 10000);
        await coin.connect(carol).approve(raid.address, 10000);
        await coin.connect(dan).approve(raid.address, 10000);

        await maids.connect(bob).approve(raid.address, 0);
        await lgirls.connect(carol).approve(raid.address, 0);
        await sgirls.connect(dan).approve(raid.address, 0);

        await expect(() => raid.connect(alice).enter(0, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000); //without maids and the like
        await expect(() => raid.connect(bob).enter(0, maids.address, 0)).to.changeTokenBalance(coin, bob, -10000); //with maids
        await expect(() => raid.connect(carol).enter(0, lgirls.address, 0)).to.changeTokenBalance(coin, carol, -10000); //with lgirls
        await expect(raid.connect(dan).enter(0, sgirls.address, 0)).to.be.revertedWith(
            "NurseRaid: The maids is not approved"
        ); //sgirls are not approved.

        expect(await maids.ownerOf(0)).to.be.equal(raid.address);
        expect(await lgirls.ownerOf(0)).to.be.equal(raid.address);
        expect(await sgirls.ownerOf(0)).to.be.equal(dan.address);
    });

    it("should be that 0.3% of raid entrance fee go to Maid Cafe", async () => {
        const { raid, maids, coin, cafe, deployer, alice, bob } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await raid.create(10000, 0, 5, 50, 100);

        {
            await coin.transfer(alice.address, 100000);
            await coin.transfer(bob.address, 100000);

            await coin.connect(alice).approve(raid.address, 100000);
            await coin.connect(bob).approve(raid.address, 100000);

            await maids.connect(bob).setApprovalForAll(raid.address, true);
        }

        expect(await coin.balanceOf(cafe.address)).to.be.equal(0);
        await raid.connect(alice).enter(0, AddressZero, 0);
        expect(await coin.balanceOf(cafe.address)).to.be.equal(30);
        await raid.connect(bob).enter(0, maids.address, 0);
        expect(await coin.balanceOf(cafe.address)).to.be.equal(60);
    });

    it("should be that Maids and the like whose power is more than 0 help to lower the duration of raids", async () => {
        const { raid, maids, lgirls, sgirls, coin, lpToken, deployer, alice, bob, carol, dan, erin } =
            await setupTest();

        await raid.approveMaids([maids.address, lgirls.address, sgirls.address]);

        await maids.mint(10);
        await maids.transferFrom(deployer.address, bob.address, 0);
        await lgirls.transferFrom(deployer.address, carol.address, 20);
        await sgirls.mint(30);
        await sgirls.transferFrom(deployer.address, dan.address, 0);

        await maids.mint(10);
        await maids.transferFrom(deployer.address, erin.address, 1);
        await lpToken.mint(erin.address, tokenAmount(30));
        await lpToken.connect(erin).approve(maids.address, tokenAmount(30));
        await maids.connect(erin).support(1, tokenAmount(30));

        expect(await maids.powerOf(0)).to.be.equal(10);
        expect(await lgirls.powerOf(20)).to.be.equal(20);
        expect(await sgirls.powerOf(0)).to.be.equal(30);
        expect(await maids.powerOf(1)).to.be.equal(40);

        await raid.create(10000, 0, 5, 5000, 10000);

        {
            await coin.transfer(alice.address, 10000);
            await coin.transfer(bob.address, 10000);
            await coin.transfer(carol.address, 10000);
            await coin.transfer(dan.address, 10000);
            await coin.transfer(erin.address, 10000);

            await coin.connect(alice).approve(raid.address, 10000);
            await coin.connect(bob).approve(raid.address, 10000);
            await coin.connect(carol).approve(raid.address, 10000);
            await coin.connect(dan).approve(raid.address, 10000);
            await coin.connect(erin).approve(raid.address, 10000);

            await maids.connect(bob).setApprovalForAll(raid.address, true);
            await lgirls.connect(carol).setApprovalForAll(raid.address, true);
            await sgirls.connect(dan).setApprovalForAll(raid.address, true);
            await maids.connect(erin).setApprovalForAll(raid.address, true);
        }

        await autoMining(false);
        await raid.connect(alice).enter(0, AddressZero, 0);
        await raid.connect(bob).enter(0, maids.address, 0);
        await raid.connect(carol).enter(0, lgirls.address, 20);
        await raid.connect(dan).enter(0, sgirls.address, 0);
        await raid.connect(erin).enter(0, maids.address, 1);
        await expect(() => mine()).to.changeTokenBalances(
            coin,
            [alice, bob, carol, dan, erin],
            [-10000, -10000, -10000, -10000, -10000]
        );

        await autoMining(true);
        const enterBlock = await getBlock();
        const numerator = (await raid.maidEfficacy())[0];
        const denominator = (await raid.maidEfficacy())[1];

        const endBlockOfAlice = enterBlock + 5000;
        const endBlockOfBob =
            enterBlock + 5000 - BigNumber.from(5000).mul(10).mul(numerator).div(denominator).toNumber();
        const endBlockOfCarol =
            enterBlock + 5000 - BigNumber.from(5000).mul(20).mul(numerator).div(denominator).toNumber();
        const endBlockOfDan =
            enterBlock + 5000 - BigNumber.from(5000).mul(30).mul(numerator).div(denominator).toNumber();
        const endBlockOfErin =
            enterBlock + 5000 - BigNumber.from(5000).mul(40).mul(numerator).div(denominator).toNumber();

        // console.log(enterBlock, endBlockOfAlice, endBlockOfBob, endBlockOfCarol, endBlockOfDan, endBlockOfErin);

        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.false;
        expect(await raid.connect(carol).checkDone(0)).to.be.false;
        expect(await raid.connect(dan).checkDone(0)).to.be.false;
        expect(await raid.connect(erin).checkDone(0)).to.be.false;

        await mine(endBlockOfErin - enterBlock);
        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.false;
        expect(await raid.connect(carol).checkDone(0)).to.be.false;
        expect(await raid.connect(dan).checkDone(0)).to.be.false;
        expect(await raid.connect(erin).checkDone(0)).to.be.true;

        await mine(endBlockOfDan - endBlockOfErin);
        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.false;
        expect(await raid.connect(carol).checkDone(0)).to.be.false;
        expect(await raid.connect(dan).checkDone(0)).to.be.true;
        expect(await raid.connect(erin).checkDone(0)).to.be.true;

        await mine(endBlockOfCarol - endBlockOfDan);
        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.false;
        expect(await raid.connect(carol).checkDone(0)).to.be.true;
        expect(await raid.connect(dan).checkDone(0)).to.be.true;
        expect(await raid.connect(erin).checkDone(0)).to.be.true;

        await mine(endBlockOfBob - endBlockOfCarol);
        expect(await raid.connect(alice).checkDone(0)).to.be.false;
        expect(await raid.connect(bob).checkDone(0)).to.be.true;
        expect(await raid.connect(carol).checkDone(0)).to.be.true;
        expect(await raid.connect(dan).checkDone(0)).to.be.true;
        expect(await raid.connect(erin).checkDone(0)).to.be.true;

        await mine(endBlockOfAlice - endBlockOfBob);
        expect(await raid.connect(alice).checkDone(0)).to.be.true;
        expect(await raid.connect(bob).checkDone(0)).to.be.true;
        expect(await raid.connect(carol).checkDone(0)).to.be.true;
        expect(await raid.connect(dan).checkDone(0)).to.be.true;
        expect(await raid.connect(erin).checkDone(0)).to.be.true;
    });
});
