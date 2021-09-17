import {
    Maids,
    MaidCoin,
    NursePart,
    NurseRaid,
    TestLPToken,
    TestRNG,
    WETH,
    MaidCafe,
    TheMaster,
    CloneNurses,
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

    const TheMaster = await ethers.getContractFactory("TheMaster");
    const theMaster = (await TheMaster.deploy(
        tokenAmount(1),
        520000,
        1000,
        coin.address,
        lpToken.address,
        sushi.address
    )) as TheMaster;

    const CloneNurses = await ethers.getContractFactory("CloneNurses");
    const nurses = (await CloneNurses.deploy(
        part.address,
        coin.address,
        theMaster.address,
        cafe.address
    )) as CloneNurses;

    const TestRNG = await ethers.getContractFactory("TestRNG");
    const rng = (await TestRNG.deploy()) as TestRNG;

    const NurseRaid = await ethers.getContractFactory("NurseRaid");
    const raid = (await NurseRaid.deploy(
        coin.address,
        cafe.address,
        part.address,
        nurses.address,
        rng.address,
        sgirls.address,
        lgirls.address
    )) as NurseRaid;
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
        nurses,
    };
};

describe("NurseRaid", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("should be that users can participate in several raids at the same time", async () => {
        const { raid, maids, coin, deployer, alice, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        await maids.mint(1);
        await maids.transferFrom(deployer.address, alice.address, 0);

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);

        await expect(
            raid.create([10000, 10000, 9999], [0, 0, 0], [5, 5, 5], [50, 50, 50], [100, 100, 100])
        ).to.be.revertedWith("NurseRaid: Fee should be higher");

        await raid.create([10000, 10000, 10000], [0, 0, 0], [5, 5, 5], [50, 50, 50], [100, 100, 100]);
        let events: any = await raid.queryFilter(raid.filters.Create(), "latest");
        {
            expect(events.length).to.be.equal(3);

            expect(events[0].args[0]).to.be.equal(0);
            expect(events[0].args[1]).to.be.equal(10000);
            expect(events[0].args[2]).to.be.equal(0);
            expect(events[0].args[3]).to.be.equal(5);
            expect(events[0].args[4]).to.be.equal(50);
            expect(events[0].args[5]).to.be.equal(100);

            expect(events[1].args[0]).to.be.equal(1);
            expect(events[1].args[1]).to.be.equal(10000);
            expect(events[1].args[2]).to.be.equal(0);
            expect(events[1].args[3]).to.be.equal(5);
            expect(events[1].args[4]).to.be.equal(50);
            expect(events[1].args[5]).to.be.equal(100);

            expect(events[2].args[0]).to.be.equal(2);
            expect(events[2].args[1]).to.be.equal(10000);
            expect(events[2].args[2]).to.be.equal(0);
            expect(events[2].args[3]).to.be.equal(5);
            expect(events[2].args[4]).to.be.equal(50);
            expect(events[2].args[5]).to.be.equal(100);
        }

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
        const { raid, maids, coin, deployer, alice, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        await maids.mint(1);
        await maids.transferFrom(deployer.address, alice.address, 0);

        await nurses.addNurseType([5, 5, 5], [5000, 7000, 10000], [10, 20, 30], [2000, 1000, 3000]);
        await raid.create([10000, 10000], [0, 0], [5, 5], [50, 50], [100, 100]);

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
        const { raid, maids, coin, part, deployer, alice, bob, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await nurses.addNurseType([5], [9999], [10], [2000]);
        await expect(raid.create([5994], [0], [3], [50], [100])).to.be.revertedWith("NurseRaid: Fee should be higher");
        await raid.create([10000], [0], [5], [50], [100]);

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

        await expect(raid.connect(alice).exit([0]))
            .to.emit(raid, "Exit")
            .withArgs(alice.address, 0);
        await expect(raid.connect(bob).exit([0]))
            .to.emit(raid, "Exit")
            .withArgs(bob.address, 0);
        expect(await part.balanceOf(alice.address, 0)).to.be.equal(0);
        expect(await part.balanceOf(bob.address, 0)).to.be.equal(0);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
    });

    it("should be that an user who alreay participated in a raid can not re-enter the raid before exiting", async () => {
        const { raid, maids, coin, part, deployer, alice, bob, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);
        await raid.create([10000], [0], [5], [50], [100]);

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
        await expect(raid.connect(alice).exit([0]))
            .to.emit(raid, "Exit")
            .withArgs(alice.address, 0);
        await expect(raid.connect(bob).exit([0]))
            .to.emit(raid, "Exit")
            .withArgs(bob.address, 0);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
        expect(await part.balanceOf(alice.address, 0)).to.be.gte(1);
        expect(await part.balanceOf(bob.address, 0)).to.be.gte(1);

        await expect(() => raid.connect(alice).enter(0, AddressZero, 0)).to.changeTokenBalance(coin, alice, -10000);
        await expect(() => raid.connect(bob).enter(0, maids.address, 0)).to.changeTokenBalance(coin, bob, -10000);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);
    });

    it("should be that only approved Maids can participate in raids", async () => {
        const { raid, maids, lgirls, sgirls, coin, deployer, alice, bob, carol, dan, nurses } = await setupTest();

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

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);

        await raid.create([10000], [0], [5], [100], [10000]);

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
        const { raid, maids, coin, cafe, deployer, alice, bob, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);

        await raid.create([10000], [0], [5], [50], [100]);

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
        const { raid, maids, lgirls, sgirls, coin, lpToken, deployer, alice, bob, carol, dan, erin, nurses } =
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

        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10);
        expect(await raid.powerOfMaids(lgirls.address, 20)).to.be.equal(20);
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30);
        expect(await raid.powerOfMaids(maids.address, 1)).to.be.equal(40);

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);

        await raid.create([10000], [0], [5], [5000], [10000]);

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

    it("should be that users can exit from several raids at the same time", async () => {
        const { raid, maids, coin, part, deployer, alice, bob, nurses } = await setupTest();

        await raid.approveMaids([maids.address]);
        expect(await raid.isMaidsApproved(maids.address)).to.be.true;
        await maids.mint(1);
        await maids.transferFrom(deployer.address, bob.address, 0);

        await nurses.addNurseType([5, 5, 5], [10000, 10000, 10000], [10, 20, 30], [2000, 1000, 3000]);

        await raid.create([10000, 10000], [0, 1], [5, 5], [50, 50], [1000, 1000]);

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

        await raid.connect(alice).enter(1, AddressZero, 0);
        await raid.connect(bob).enter(1, AddressZero, 0);

        await mine(50);

        {
            expect(await raid.connect(alice).checkDone(0)).to.be.true;
            expect(await raid.connect(alice).checkDone(1)).to.be.true;
            expect(await raid.connect(bob).checkDone(0)).to.be.true;
            expect(await raid.connect(bob).checkDone(1)).to.be.true;
        }

        await raid.connect(alice).exit([0, 1]);
        let events: any = await raid.queryFilter(raid.filters.Exit(), "latest");
        expect(events.length).to.be.equal(2);
        expect(events[0].args[0]).to.be.equal(alice.address);
        expect(events[1].args[0]).to.be.equal(alice.address);
        expect(events[0].args[1]).to.be.equal(0);
        expect(events[1].args[1]).to.be.equal(1);

        await raid.connect(bob).exit([0, 1]);
        events = await raid.queryFilter(raid.filters.Exit(), "latest");
        expect(events.length).to.be.equal(2);
        expect(events[0].args[0]).to.be.equal(bob.address);
        expect(events[1].args[0]).to.be.equal(bob.address);
        expect(events[0].args[1]).to.be.equal(0);
        expect(events[1].args[1]).to.be.equal(1);

        const part0_alice = await part.balanceOf(alice.address, 0);
        const part1_alice = await part.balanceOf(alice.address, 1);
        const part0_bob = await part.balanceOf(bob.address, 0);
        const part1_bob = await part.balanceOf(bob.address, 1);

        expect(part0_alice).to.be.gt(0);
        expect(part1_alice).to.be.gt(0);
        expect(part0_bob).to.be.gt(0);
        expect(part1_bob).to.be.gt(0);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);

        await raid.connect(alice).enter(0, AddressZero, 0);
        await raid.connect(bob).enter(0, maids.address, 0);
        expect(await maids.ownerOf(0)).to.be.equal(raid.address);

        await mine(30);
        await raid.connect(alice).enter(1, AddressZero, 0);
        await raid.connect(bob).enter(1, AddressZero, 0);

        await mine(30);
        {
            expect(await raid.connect(alice).checkDone(0)).to.be.true;
            expect(await raid.connect(alice).checkDone(1)).to.be.false;
            expect(await raid.connect(bob).checkDone(0)).to.be.true;
            expect(await raid.connect(bob).checkDone(1)).to.be.false;
        }

        await raid.connect(alice).exit([0, 1]);
        events = await raid.queryFilter(raid.filters.Exit(), "latest");
        expect(events.length).to.be.equal(2);
        expect(events[0].args[0]).to.be.equal(alice.address);
        expect(events[1].args[0]).to.be.equal(alice.address);
        expect(events[0].args[1]).to.be.equal(0);
        expect(events[1].args[1]).to.be.equal(1);

        await raid.connect(bob).exit([0, 1]);
        events = await raid.queryFilter(raid.filters.Exit(), "latest");
        expect(events.length).to.be.equal(2);
        expect(events[0].args[0]).to.be.equal(bob.address);
        expect(events[1].args[0]).to.be.equal(bob.address);
        expect(events[0].args[1]).to.be.equal(0);
        expect(events[1].args[1]).to.be.equal(1);

        expect(await part.balanceOf(alice.address, 0)).to.be.gt(part0_alice);
        expect(await part.balanceOf(alice.address, 1)).to.be.equal(part1_alice);
        expect(await part.balanceOf(bob.address, 0)).to.be.gt(part0_bob);
        expect(await part.balanceOf(bob.address, 1)).to.be.equal(part1_bob);
        expect(await maids.ownerOf(0)).to.be.equal(bob.address);
    });

    it("should be that supporting Maids and the like with LP tokens can change the power of them", async () => {
        const { raid, maids, lgirls, sgirls, lpToken, deployer, alice, bob, carol, dan, erin } = await setupTest();

        await maids.mint(10);
        expect((await maids.maids(0)).originPower).to.be.equal(10);
        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10);

        expect((await lgirls.lingerieGirls(0)).originPower).to.be.equal(0);
        expect(await raid.powerOfMaids(lgirls.address, 0)).to.be.equal(0);

        await sgirls.mint(30);
        expect((await sgirls.sushiGirls(0)).originPower).to.be.equal(30);
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30);

        await lpToken.mint(deployer.address, tokenAmount(10000));
        await lpToken.approve(maids.address, tokenAmount(10000000));
        await lpToken.approve(lgirls.address, tokenAmount(10000000));
        await lpToken.approve(sgirls.address, tokenAmount(10000000));

        expect(await raid.lpTokenToMaidPower()).to.be.equal(1000);
        await maids.support(0, tokenAmount(1));
        await lgirls.support(0, tokenAmount(2));
        await sgirls.support(0, tokenAmount(0.99));
        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10 + 1);
        expect(await raid.powerOfMaids(lgirls.address, 0)).to.be.equal(0 + 2);
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30 + 0);

        await maids.support(0, tokenAmount(1.5)); //2.5
        await lgirls.support(0, tokenAmount(2.5)); //4.5
        await sgirls.support(0, tokenAmount(1.1)); //2.09
        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10 + 2);
        expect(await raid.powerOfMaids(lgirls.address, 0)).to.be.equal(0 + 4);
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30 + 2);

        await raid.changeLPTokenToMaidPower(500); //=> /2
        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10 + Math.floor(2.5 / 2));
        expect(await raid.powerOfMaids(lgirls.address, 0)).to.be.equal(0 + Math.floor(4.5 / 2));
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30 + Math.floor(2.09 / 2));

        await raid.changeLPTokenToMaidPower(2100); //=> *2.1
        expect(await raid.powerOfMaids(maids.address, 0)).to.be.equal(10 + Math.floor(2.5 * 2.1));
        expect(await raid.powerOfMaids(lgirls.address, 0)).to.be.equal(0 + Math.floor(4.5 * 2.1));
        expect(await raid.powerOfMaids(sgirls.address, 0)).to.be.equal(30 + Math.floor(2.09 * 2.1));
    });
});
