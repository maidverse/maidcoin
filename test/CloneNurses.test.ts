import { MaidCoin, NursePart, CloneNurses, WETH, MaidCafe, TheMaster, TestLPToken, TestSushiToken } from "../typechain";

import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, BigNumberish, BytesLike, Contract } from "ethers";
import { mine, getBlock, autoMining, mineTo } from "./shared/utils/blockchain";

const { constants } = ethers;
const { AddressZero, HashZero, Zero } = constants;

const tokenAmount = (number: number) => {
    return ethers.utils.parseEther(String(number));
};

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan, erin, frank] = signers;

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const coin = (await MaidCoin.deploy()) as MaidCoin;

    const WETH = await ethers.getContractFactory("WETH");
    const weth = (await WETH.deploy()) as WETH;

    const MaidCafe = await ethers.getContractFactory("MaidCafe");
    const cafe = (await MaidCafe.deploy(coin.address, weth.address)) as MaidCafe;

    const NursePart = await ethers.getContractFactory("NursePart");
    const part = (await NursePart.deploy(cafe.address)) as NursePart;

    const TestLPToken = await ethers.getContractFactory("TestLPToken");
    const lpToken = (await TestLPToken.deploy()) as TestLPToken;

    const TestSushiToken = await ethers.getContractFactory("TestSushiToken");
    const sushi = (await TestSushiToken.deploy()) as TestSushiToken;

    const startBlock = 150;

    const TheMaster = await ethers.getContractFactory("TheMaster");
    const theMaster = (await TheMaster.deploy(
        tokenAmount(1),
        520000,
        startBlock,
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

    await coin.transferOwnership(theMaster.address);
    await theMaster.add(coin.address, false, false, AddressZero, 0, 100);
    await theMaster.add(lpToken.address, false, false, AddressZero, 0, 90);
    await theMaster.add(nurses.address, true, true, AddressZero, 0, 300);
    await theMaster.add(lpToken.address, false, false, nurses.address, 10, 510);

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
        TheMaster,
        theMaster,
        weth,
        lpToken,
        cafe,
        part,
        nurses,
    };
};

describe("CloneNurse", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    async function burnAmount(coin: Contract) {
        const eventFilter = coin.filters.Transfer(null, AddressZero, null);
        const events = await coin.queryFilter(eventFilter, "latest");

        if (events[0]?.args !== undefined) {
            return events[0].args[2];
        }
        return 0;
    }

    it("should be that assemble function works well", async () => {
        const { nurses, part, alice } = await setupTest();

        await part.mint(alice.address, 0, 5);
        await part.mint(alice.address, 1, 10);
        await part.mint(alice.address, 2, 30);
        await part.connect(alice).setApprovalForAll(nurses.address, true);

        await nurses.addNurseType([3, 5, 5], [1000, 1500, 2000], [10, 20, 30], [2000, 1000, 3000]);

        await expect(nurses.connect(alice).assemble(0, 2)).to.be.revertedWith("CloneNurses: Not enough parts");
        await expect(nurses.connect(alice).assemble(0, 3))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, alice.address, 0);
        expect(await part.balanceOf(alice.address, 0)).to.be.equal(2);
        expect(await getBlock()).to.be.lt(150);
        let n0EndBlock = 150 + 2000;
        expect((await nurses.nurses(0))[1]).to.be.equal(n0EndBlock);

        await nurses.connect(alice).assemble(1, 5 + 4);
        let n1EndBlock = 150 + 1000 * 2;
        expect((await nurses.nurses(1))[1]).to.be.equal(n1EndBlock);

        await nurses.connect(alice).assemble(2, 5 + 2);
        let n2EndBlock = 150 + 3000 * 1.5;
        expect((await nurses.nurses(2))[1]).to.be.equal(n2EndBlock);

        await nurses.connect(alice).assemble(2, 5 + 9);
        let n3EndBlock = 150 + 3000 * (1 + 9 / 4);
        expect((await nurses.nurses(3))[1]).to.be.equal(n3EndBlock);

        await expect(nurses.connect(alice).assemble(2, 15)).to.be.revertedWith(
            "ERC1155: insufficient balance for transfer"
        );

        for (let i = 0; i < 4; i++) {
            expect(await nurses.supportingRoute(i)).to.be.equal(i);
            expect(await nurses.supportedPower(i)).to.be.equal(0);
            expect(await nurses.totalRewardsFromSupporters(i)).to.be.equal(0);
        }
    });

    it("should be that elongateLifetime function works well", async () => {
        async function _startBlock() {
            const nextBlock = (await getBlock()) + 1;
            return nextBlock > 150 ? nextBlock : 150;
        }

        const { nurses, part, theMaster, coin, alice, bob } = await setupTest();

        await part.mint(alice.address, 0, 7);
        await part.mint(alice.address, 1, 10);
        await part.mint(bob.address, 1, 30);
        await part.connect(alice).setApprovalForAll(nurses.address, true);
        await part.connect(bob).setApprovalForAll(nurses.address, true);

        await nurses.addNurseType([3, 5], [1000, 1500], [10, 20], [100, 200]);

        await nurses.connect(alice).assemble(0, 3);
        let n0EndBlock = (await _startBlock()) + 100;
        expect((await nurses.nurses(0))[1]).to.be.equal(n0EndBlock);

        await nurses.connect(alice).assemble(1, 5 + 4);
        let n1EndBlock = (await _startBlock()) + 200 * 2;
        expect((await nurses.nurses(1))[1]).to.be.equal(n1EndBlock);

        await nurses.connect(bob).assemble(1, 5 + 2);
        let n2EndBlock = (await _startBlock()) + 200 * 1.5;
        expect((await nurses.nurses(2))[1]).to.be.equal(n2EndBlock);

        await mine(5);
        let inc = 100 / (3 - 1);
        await expect(nurses.connect(alice).elongateLifetime([0], [1]))
            .to.emit(nurses, "ElongateLifetime")
            .withArgs(0, inc, n0EndBlock, (n0EndBlock = n0EndBlock + inc));

        await expect(nurses.connect(alice).elongateLifetime([0], [0])).to.be.revertedWith(
            "CloneNurses: Invalid amounts of parts"
        );
        await expect(nurses.connect(alice).elongateLifetime([0], [4])).to.be.revertedWith(
            "ERC1155: insufficient balance for transfer"
        );
        await expect(nurses.connect(alice).elongateLifetime([2], [2])).to.be.revertedWith("CloneNurses: Forbidden");

        await mineTo(153);
        // console.log((await nurses.nurses(0))[1].toString());// 300
        // console.log((await nurses.nurses(1))[1].toString());// 550
        // console.log((await nurses.nurses(2))[1].toString());// 450

        const totalPower = 10 + 20 + 20;
        const n0Power = 10;
        const n1Power = 20;
        const n2Power = 20;

        {
            expect((await theMaster.poolInfo(2))[7]).to.be.equal(totalPower);
            expect((await theMaster.userInfo(2, 0))[0]).to.be.equal(n0Power);
            expect((await theMaster.userInfo(2, 1))[0]).to.be.equal(n1Power);
            expect((await theMaster.userInfo(2, 2))[0]).to.be.equal(n2Power);
        }

        const rewardPerBlock = (await theMaster.initialRewardPerBlock())
            .mul((await theMaster.poolInfo(2))[4])
            .div(await theMaster.totalAllocPoint());

        let nursesReward = rewardPerBlock.mul(153 - 150);
        await expect(() => nurses.connect(alice).elongateLifetime([0], [1])).to.changeTokenBalance(
            coin,
            alice,
            nursesReward.mul(n0Power).div(totalPower)
        );
        expect(await burnAmount(coin)).to.be.equal(0);

        expect((await nurses.nurses(0))[2]).to.be.equal(153);
        n0EndBlock += inc;

        await mineTo(355);
        expect((await nurses.nurses(0))[1]).to.be.equal(n0EndBlock);
        expect(n0EndBlock).to.be.gt(153);
        expect(n0EndBlock).to.be.lt(355);

        nursesReward = rewardPerBlock.mul(355 - 153);
        let n0total = nursesReward.mul(n0Power).div(totalPower);
        let n0claim = n0total.mul(n0EndBlock - 153).div(355 - 153);
        let n0burn = n0total.sub(n0claim);

        await expect(() => nurses.connect(alice).elongateLifetime([0], [1])).to.changeTokenBalance(
            coin,
            alice,
            n0claim
        );
        expect(await burnAmount(coin)).to.be.equal(n0burn);

        n0EndBlock = 355 + inc;

        await mine(inc + 10);
        let lastBlock = await getBlock();
        expect((await nurses.nurses(0))[1]).to.be.equal(n0EndBlock);
        expect(n0EndBlock).to.be.gt(355);
        expect(n0EndBlock).to.be.lt(lastBlock);

        nursesReward = rewardPerBlock.mul(inc + 10 + 1);
        n0total = nursesReward.mul(n0Power).div(totalPower);
        n0claim = n0total.mul(n0EndBlock - 355).div(lastBlock + 1 - 355);
        n0burn = n0total.sub(n0claim);

        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, n0claim);
        expect(await burnAmount(coin)).to.be.equal(n0burn);

        let lastClaimedBlock0 = lastBlock + 1;

        await mine(10);
        lastBlock = await getBlock();
        expect((await nurses.nurses(0))[1]).to.be.equal(n0EndBlock);
        expect(n0EndBlock).to.be.lt(lastClaimedBlock0);
        expect(n0EndBlock).to.be.lt(lastBlock);

        nursesReward = rewardPerBlock.mul(11);
        n0total = nursesReward.mul(n0Power).div(totalPower);
        n0claim = Zero;
        n0burn = n0total;

        await expect(() => nurses.connect(alice).elongateLifetime([0], [1])).to.changeTokenBalance(coin, alice, 0);
        expect(await burnAmount(coin)).to.be.equal(n0burn);

        await part.mint(alice.address, 0, 100);
        await part.mint(alice.address, 1, 100);

        await nurses.connect(alice).assemble(0, 5);
        await nurses.connect(alice).assemble(0, 5);
        await nurses.connect(alice).assemble(1, 7);
        await nurses.connect(alice).assemble(1, 7);

        const e3 = (await nurses.nurses(3))[1];
        const e4 = (await nurses.nurses(4))[1];
        const e5 = (await nurses.nurses(5))[1];
        const e6 = (await nurses.nurses(6))[1];

        await nurses.connect(alice).elongateLifetime([3, 4, 5, 6], [2, 2, 4, 4]);
        expect((await nurses.nurses(3))[1]).to.be.equal(e3.add(100));
        expect((await nurses.nurses(4))[1]).to.be.equal(e4.add(100));
        expect((await nurses.nurses(5))[1]).to.be.equal(e5.add(200));
        expect((await nurses.nurses(6))[1]).to.be.equal(e6.add(200));
    });

    it("should be that destroy function works well", async () => {
        const { coin, nurses, part, theMaster, alice, bob, carol } = await setupTest();

        await part.mint(alice.address, 0, 30);
        await part.mint(bob.address, 1, 30);
        await part.mint(carol.address, 2, 30);
        await part.connect(alice).setApprovalForAll(nurses.address, true);
        await part.connect(bob).setApprovalForAll(nurses.address, true);
        await part.connect(carol).setApprovalForAll(nurses.address, true);

        await nurses.addNurseType([2, 4], [1000, 2000], [11, 22], [100, 200]);
        await nurses.addNurseType([6], [3000], [33], [300]);

        await expect(nurses.connect(alice).assemble(0, 3))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, alice.address, 0);
        await expect(nurses.connect(alice).assemble(0, 4))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, alice.address, 1);

        await expect(nurses.connect(bob).assemble(1, 4))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, bob.address, 2);
        await expect(nurses.connect(bob).assemble(1, 5))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, bob.address, 3);

        await expect(nurses.connect(carol).assemble(2, 6))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, carol.address, 4);
        await expect(nurses.connect(carol).assemble(2, 7))
            .to.emit(nurses, "Transfer")
            .withArgs(AddressZero, carol.address, 5);

        {
            expect(await nurses.ownerOf(0)).to.be.equal(alice.address);
            expect(await nurses.ownerOf(1)).to.be.equal(alice.address);
            expect(await nurses.ownerOf(2)).to.be.equal(bob.address);
            expect(await nurses.ownerOf(3)).to.be.equal(bob.address);
            expect(await nurses.ownerOf(4)).to.be.equal(carol.address);
            expect(await nurses.ownerOf(5)).to.be.equal(carol.address);

            for (let i = 0; i < 6; i++) {
                expect(await nurses.supportingRoute(i)).to.be.equal(i);
                expect((await nurses.nurses(i))[2]).to.be.equal(150);
            }
        }

        await expect(nurses.connect(carol).destroy([0], [5])).to.be.revertedWith("CloneNurses: Forbidden");
        await expect(nurses.connect(carol).destroy([5], [5])).to.be.revertedWith("CloneNurses: Invalid id, toId");
        await expect(nurses.connect(carol).destroy([5], [6])).to.be.revertedWith("CloneNurses: Invalid toId");

        await expect(() => nurses.connect(carol).destroy([5, 4], [4, 0])).to.changeTokenBalance(coin, carol, 6000);
        expect(await nurses.supportingRoute(5)).to.be.equal(4);
        expect(await nurses.supportingRoute(4)).to.be.equal(0);
        expect(await nurses.supportingRoute(5)).to.be.equal(4); //not changed yet
        await expect(nurses.connect(carol).destroy([5], [0])).to.be.revertedWith(
            "ERC721: owner query for nonexistent token"
        );

        await mineTo(210);
        const rewardPerBlock = (await theMaster.initialRewardPerBlock())
            .mul((await theMaster.poolInfo(2))[4])
            .div(await theMaster.totalAllocPoint());

        let nursesReward = rewardPerBlock.mul(60);
        let n0total = nursesReward.mul(11).div(66);
        let n0claim = n0total;
        let n0burn = Zero;

        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, n0claim.sub(1)); //due to solidity math (smath)
        expect((await nurses.nurses(0))[2]).to.be.equal(210);
        let n0EndBlock = (await nurses.nurses(0))[1];

        // console.log(n0EndBlock.toNumber());   //   350
        // console.log((await nurses.nurses(1))[1].toString());   //  450
        // console.log((await nurses.nurses(2))[1].toString());   //  350
        // console.log((await nurses.nurses(3))[1].toString());   //  416

        await mineTo(360);
        nursesReward = rewardPerBlock.mul(150);
        n0total = nursesReward.mul(11).div(66);
        n0claim = n0total.mul(n0EndBlock.sub(210)).div(360 - 210);
        n0burn = n0total.sub(n0claim);

        await expect(() => nurses.connect(alice).destroy([0], [1])).to.changeTokenBalance(
            coin,
            alice,
            n0claim.add(1000)
        );
        expect(await burnAmount(coin)).to.be.equal(n0burn);

        nursesReward = rewardPerBlock.mul(360 - 150);

        let n1total = nursesReward.mul(11).div(66);
        n1total = n1total.add(rewardPerBlock.mul(11).div(55));
        let n1claim = n1total;

        let n2total = nursesReward.mul(22).div(66);
        n2total = n2total.add(rewardPerBlock.mul(22).div(55));
        let n2claim = n2total.mul(350 - 150).div(361 - 150);
        let n2burn = n2total.sub(n2claim);
        // console.log("n2", n2total.toString(), n2claim.toString(), n2burn.toString());

        await autoMining(false);
        await nurses.connect(alice).destroy([1], [2]);
        await nurses.connect(bob).destroy([2], [3]);
        await expect(() => mine()).to.changeTokenBalances(
            coin,
            [alice, bob],
            [n1claim.add(1000).sub(1), n2claim.add(2000).sub(1)] //smath
        );
        await autoMining(true);
        expect(await burnAmount(coin)).to.be.equal(n2burn);
    });

    it("should be that claim function works well", async () => {
        const { coin, nurses, part, theMaster, alice, bob, carol } = await setupTest();

        await part.mint(alice.address, 0, 30);
        await part.mint(bob.address, 1, 30);
        await part.mint(carol.address, 2, 30);
        await part.connect(alice).setApprovalForAll(nurses.address, true);
        await part.connect(bob).setApprovalForAll(nurses.address, true);
        await part.connect(carol).setApprovalForAll(nurses.address, true);

        await nurses.addNurseType([2], [1000], [10], [100]);
        await nurses.addNurseType([4], [2000], [20], [200]);
        await nurses.addNurseType([6], [3000], [30], [300]);

        await nurses.connect(alice).assemble(0, 2);
        await nurses.connect(bob).assemble(1, 4);
        await nurses.connect(carol).assemble(2, 6);
        await nurses.connect(alice).assemble(0, 5);

        {
            expect(await nurses.ownerOf(0)).to.be.equal(alice.address);
            expect(await nurses.ownerOf(1)).to.be.equal(bob.address);
            expect(await nurses.ownerOf(2)).to.be.equal(carol.address);
            expect(await nurses.ownerOf(3)).to.be.equal(alice.address);

            for (let i = 0; i < 4; i++) {
                expect(await nurses.supportingRoute(i)).to.be.equal(i);
                expect((await nurses.nurses(i))[2]).to.be.equal(150);
            }
        }

        expect((await nurses.nurses(0))[1]).to.be.equal(250);
        expect((await nurses.nurses(1))[1]).to.be.equal(350);
        expect((await nurses.nurses(2))[1]).to.be.equal(450);
        expect((await nurses.nurses(3))[1]).to.be.equal(550);

        await mineTo(100);
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, 0);

        await mineTo(150);
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, 0);

        await mineTo(160);
        const reward0 = (await theMaster.pendingReward(2, 0)).mul(10).div(9);
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, reward0);

        await mineTo(170);
        await autoMining(false);
        await nurses.connect(alice).claim([0]);
        await nurses.connect(alice).claim([0]);
        await expect(() => mine()).to.changeTokenBalance(coin, alice, reward0);
        await autoMining(true);

        await mineTo(175);
        await expect(() => nurses.connect(alice).claim([0, 0])).to.changeTokenBalance(
            coin,
            alice,
            reward0.div(2).add(1)
        ); //smath

        await mineTo(180);
        const reward1 = reward0.div(2).add((await theMaster.pendingReward(2, 3)).mul(30).div(29));
        await expect(() => nurses.connect(alice).claim([0, 3])).to.changeTokenBalance(coin, alice, reward1.add(1)); //smath

        await mineTo(189);
        await nurses.connect(carol).assemble(2, 6);
        const rewardPerBlock = (await theMaster.initialRewardPerBlock())
            .mul((await theMaster.poolInfo(2))[4])
            .div(await theMaster.totalAllocPoint());
        const reward2 = (await theMaster.pendingReward(2, 0)).add(rewardPerBlock.mul(10).div(100));
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, reward2);

        await mineTo(300);
        const reward3Total = (await theMaster.pendingReward(2, 0)).add(rewardPerBlock.mul(10).div(100));
        const reward3 = reward3Total.mul(250 - 190).div(300 - 190);
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, reward3);

        await mineTo(310);
        await expect(() => nurses.connect(alice).claim([0])).to.changeTokenBalance(coin, alice, 0);

        await mineTo(320);
        await expect(() => nurses.connect(alice).elongateLifetime([0], [1])).to.changeTokenBalance(coin, alice, 0);
        expect((await nurses.nurses(0))[1]).to.be.equal(320 + 100);

        await mineTo(450);
        const reward4_0 = (await theMaster.pendingReward(2, 0)).add(rewardPerBlock.mul(10).div(100));
        const reward4_1 = (await theMaster.pendingReward(2, 3)).add(rewardPerBlock.mul(10).div(100));
        const reward4 = reward4_0
            .mul(420 - 320)
            .div(450 - 320)
            .add(reward4_1);
        await expect(() => nurses.connect(alice).claim([0, 3])).to.changeTokenBalance(coin, alice, reward4);
    });
});
