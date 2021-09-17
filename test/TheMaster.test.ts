import {
    MaidCoin,
    NursePart,
    CloneNurses,
    WETH,
    MaidCafe,
    TheMaster,
    TestLPToken,
    TestSushiToken,
    TestMasterChef,
    MasterCoin
} from "../typechain";

import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumber, BigNumberish, BytesLike, Contract } from "ethers";
import { mine, getBlock, autoMining, mineTo } from "./shared/utils/blockchain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

const { constants } = ethers;
const { AddressZero, HashZero, Zero, MaxUint256 } = constants;

const tokenAmount = (number: number) => {
    return ethers.utils.parseEther(String(number));
};

const INITIAL_REWARD_PER_BLOCK = tokenAmount(1);
const START_BLOCK = 300;
const PRECISION = BigNumber.from(10).pow(20);

const mineToStartBlock = async () => {
    await mine(START_BLOCK - (await ethers.provider.getBlockNumber()) - 1);
};

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan, erin, frank] = signers;

    const TestLPToken = await ethers.getContractFactory("TestLPToken");
    const lpToken = (await TestLPToken.deploy()) as TestLPToken;
    const mockLPToken = (await TestLPToken.deploy()) as TestLPToken;

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const coin = (await MaidCoin.deploy()) as MaidCoin;

    const WETH = await ethers.getContractFactory("WETH");
    const weth = (await WETH.deploy()) as WETH;

    const MaidCafe = await ethers.getContractFactory("MaidCafe");
    const cafe = (await MaidCafe.deploy(coin.address, weth.address)) as MaidCafe;

    const MasterCoin = await ethers.getContractFactory("MasterCoin");
    const master = (await MasterCoin.deploy()) as MasterCoin;

    const TestSushiToken = await ethers.getContractFactory("TestSushiToken");
    const sushi = (await TestSushiToken.deploy()) as TestSushiToken;
    const TestMasterChef = await ethers.getContractFactory("TestMasterChef");
    const sushiMC = (await TestMasterChef.deploy(
        sushi.address,
        deployer.address,
        tokenAmount(100),
        0,
        0
    )) as TestMasterChef;

    await sushiMC.add(400, mockLPToken.address, true);
    await sushiMC.add(300, mockLPToken.address, true);
    await sushiMC.add(200, weth.address, true);
    await sushiMC.add(100, lpToken.address, true);

    const NursePart = await ethers.getContractFactory("NursePart");
    const part = (await NursePart.deploy(cafe.address)) as NursePart;

    const TheMaster = await ethers.getContractFactory("TheMaster");
    const theMaster = (await TheMaster.deploy(
        INITIAL_REWARD_PER_BLOCK,
        5200,
        START_BLOCK,
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

    for (let i = 1; i < 7; i++) {
        await lpToken.mint(signers[i].address, tokenAmount(10000));
        await part.connect(signers[i]).setApprovalForAll(nurses.address, true);
        await lpToken.connect(signers[i]).approve(theMaster.address, MaxUint256);
        await part.mint(signers[i].address, 0, 100);
        await part.mint(signers[i].address, 1, 100);
        await part.mint(signers[i].address, 2, 100);
        await part.mint(signers[i].address, 3, 100);
    }

    await coin.transferOwnership(theMaster.address);

    await theMaster.add(master.address, false, false, AddressZero, 0, 10);
    await theMaster.add(lpToken.address, false, false, AddressZero, 0, 9);
    await theMaster.add(nurses.address, true, true, AddressZero, 0, 30);
    await theMaster.add(lpToken.address, false, false, nurses.address, 10, 51);

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
        master
    };
};

describe("TheMaster", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    class PoolInfo {
        allocPoint: number;
        lastRewardBlock: number;
        accRewardPerShare: BigNumber;
        totalSupply: BigNumber;

        constructor(allocPoint: number, lastRewardBlock: number) {
            this.allocPoint = allocPoint;
            this.lastRewardBlock = lastRewardBlock;
            this.accRewardPerShare = Zero;
            this.totalSupply = Zero;
        }
        set(_allocPoint: number) {
            this.allocPoint = _allocPoint;
        }
        update(block: number, amount: BigNumberish, _accRewardPerShare: BigNumberish) {
            if (this.lastRewardBlock < block) {
                this.lastRewardBlock = block;
                this.accRewardPerShare = BigNumber.from(this.accRewardPerShare).add(_accRewardPerShare);
            }
            this.totalSupply = BigNumber.from(this.totalSupply).add(amount);
            if (this.totalSupply.lt(0)) throw "totalSupply < 0";
        }
    }

    class UserInfo {
        amount: BigNumber;
        rewardDebt: BigNumber;

        constructor(amount: BigNumberish, rewardDebt: BigNumberish) {
            this.amount = BigNumber.from(amount);
            this.rewardDebt = BigNumber.from(rewardDebt);
        }

        update(amount: BigNumberish, rewardDebt: BigNumber) {
            this.amount = BigNumber.from(this.amount).add(amount);
            this.rewardDebt = rewardDebt;
            if (this.amount.lt(0)) throw "amount < 0";
        }
    }

    it("overall test_old. no sushi", async function () {
        const { alice, bob, carol, dan, lpToken, coin, part, theMaster, nurses } = await setupTest();
        await network.provider.send("evm_setAutomine", [true]);

        await nurses.addNurseType([2, 2, 2], [123, 234, 345], [100, 200, 300], [1000, 2000, 3000]);

        await nurses.connect(alice).assemble(1, 2);
        await nurses.connect(bob).assemble(2, 2);
        await nurses.connect(carol).assemble(0, 2);
        await nurses.connect(alice).assemble(1, 2);
        await nurses.connect(bob).assemble(2, 2);
        await nurses.connect(carol).assemble(0, 2);
        await nurses.connect(alice).assemble(1, 2);
        await nurses.connect(bob).assemble(2, 2);
        await nurses.connect(alice).assemble(1, 2);
        await nurses.connect(bob).assemble(2, 2);

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

        await theMaster.set([3, 2], [0, 0]);
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

        await theMaster.set([3, 2], [51, 30]);

        await theMaster.connect(dan).desupport(3, 1);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(1);

        await theMaster.connect(dan).support(3, 1, 2);
        expect(await nurses.supportingTo(dan.address)).to.be.equal(2);
    });

    it("should be that deposit/withdraw/emergencyWithdraw function works well without sushiMasterChef", async function () {
        const { alice, bob, carol, dan, erin, frank, lpToken, coin, part, theMaster, nurses } = await setupTest();

        const pool1 = new PoolInfo(9, START_BLOCK);

        async function updateInfo(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            amount: BigNumberish,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            const rewardBlock = (await getBlock()) >= START_BLOCK ? (await getBlock()) + 1 : START_BLOCK;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accRewardPerShare).div(PRECISION);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolInfo, userInfo: UserInfo, poolId: number, user: SignerWithAddress) {
            expect((await theMaster.poolInfo(poolId))[5]).to.be.equal(poolInfo.lastRewardBlock);
            expect((await theMaster.poolInfo(poolId))[6]).to.be.equal(poolInfo.accRewardPerShare);

            expect((await theMaster.userInfo(poolId, user.address))[0]).to.be.equal(userInfo.amount);
            expect((await theMaster.userInfo(poolId, user.address))[1]).to.be.equal(userInfo.rewardDebt);
        }

        async function balanceInc(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            let rewardBlock;
            if ((await getBlock()) < START_BLOCK) return 0;
            else rewardBlock = (await getBlock()) + 1;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accRewardPerShare.add(accInc)).div(PRECISION).sub(userInfo.rewardDebt);
        }

        await expect(theMaster.connect(alice).deposit(1, 100, bob.address)).to.be.revertedWith(
            "TheMaster: Deposit to your address"
        );
        await expect(theMaster.connect(alice).deposit(2, 100, alice.address)).to.be.revertedWith(
            "TheMaster: Not called by delegate"
        );
        await expect(theMaster.connect(alice).deposit(3, 100, alice.address)).to.be.revertedWith(
            "TheMaster: Use support func"
        );

        const aliceInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        const bobInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);
        expect(await getBlock()).to.be.lt(START_BLOCK);

        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(1, pool1, bobInfo, -800, 0);
        await theMaster.connect(bob).withdraw(1, 800, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await updateInfo(1, pool1, bobInfo, 700, 0);
        await theMaster.connect(bob).deposit(1, 700, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mineTo(START_BLOCK);
        await autoMining(false);
        const carolInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, carolInfo, 1000, 0);
        await theMaster.connect(carol).deposit(1, 1000, carol.address);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await mine();
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);
        expect(await coin.balanceOf(carol.address)).to.be.equal(0);

        let incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await expect(() => theMaster.connect(alice).deposit(1, 100, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await expect(theMaster.connect(alice).withdraw(1, 1000, alice.address)).to.be.revertedWith(
            "TheMaster: Insufficient amount"
        );
        await expect(theMaster.connect(alice).withdraw(3, 100, alice.address)).to.be.revertedWith(
            "TheMaster: Use desupport func"
        );
        await expect(theMaster.connect(alice).withdraw(2, 100, alice.address)).to.be.revertedWith(
            "TheMaster: Not called by delegate"
        );
        await expect(theMaster.connect(alice).withdraw(1, 100, bob.address)).to.be.revertedWith(
            "TheMaster: Not called by user"
        );

        await mineTo(500);
        incA = await balanceInc(1, pool1, aliceInfo, 0);
        let incB = await balanceInc(1, pool1, bobInfo, 0);
        let incC = await balanceInc(1, pool1, carolInfo, 0);
        await autoMining(false);
        await updateInfo(1, pool1, aliceInfo, -200, 0);
        await theMaster.connect(alice).withdraw(1, 200, alice.address);
        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await updateInfo(1, pool1, carolInfo, 3000, 0);
        await theMaster.connect(carol).deposit(1, 3000, carol.address);
        await expect(() => mine()).to.changeTokenBalances(coin, [alice, bob, carol], [incA, incB, incC]);
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        await expect(theMaster.connect(carol).emergencyWithdraw(2)).to.be.revertedWith(
            "TheMaster: Pool should be non-delegate"
        );
        await expect(theMaster.connect(carol).emergencyWithdraw(3)).to.be.revertedWith("TheMaster: Use desupport func");

        let balC = await coin.balanceOf(carol.address);
        let amountC = carolInfo.amount;
        await expect(theMaster.connect(carol).emergencyWithdraw(1))
            .to.emit(theMaster, "EmergencyWithdraw")
            .withArgs(carol.address, 1, amountC);
        carolInfo.update(amountC.mul(-1), Zero);
        pool1.update(0, amountC.mul(-1), 0);
        await checkUpdating(pool1, carolInfo, 1, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);

        // 5200
        await mineTo(START_BLOCK + 5190);

        incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 0, 0);
        await expect(() => theMaster.connect(alice).deposit(1, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, 0);
        await updateInfo(1, pool1, bobInfo, 0, 0);
        await expect(() => theMaster.connect(bob).deposit(1, 0, bob.address)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mine(10);
        const newRewardPerBlock = INITIAL_REWARD_PER_BLOCK.div(2);
        incA = await balanceInc(1, pool1, aliceInfo, newRewardPerBlock);
        await updateInfo(1, pool1, aliceInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(alice).deposit(1, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, newRewardPerBlock);
        await updateInfo(1, pool1, bobInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(bob).deposit(1, 0, bob.address)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);
    });

    it("should be that support/desupport/emergencyDesupport function works well without sushiMasterChef", async function () {
        const { alice, bob, carol, dan, erin, frank, lpToken, coin, part, theMaster, nurses } = await setupTest();

        const pool3 = new PoolInfo(51, START_BLOCK);

        async function updateInfo(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            amount: BigNumberish,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            const rewardBlock = (await getBlock()) >= START_BLOCK ? (await getBlock()) + 1 : START_BLOCK;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accRewardPerShare).div(PRECISION);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolInfo, userInfo: UserInfo, poolId: number, user: SignerWithAddress) {
            expect((await theMaster.poolInfo(poolId))[5]).to.be.equal(poolInfo.lastRewardBlock);
            expect((await theMaster.poolInfo(poolId))[6]).to.be.equal(poolInfo.accRewardPerShare);

            expect((await theMaster.userInfo(poolId, user.address))[0]).to.be.equal(userInfo.amount);
            expect((await theMaster.userInfo(poolId, user.address))[1]).to.be.equal(userInfo.rewardDebt);
        }

        async function balanceInc(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            let rewardBlock;
            if ((await getBlock()) < START_BLOCK) return Zero;
            else rewardBlock = (await getBlock()) + 1;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accRewardPerShare.add(accInc)).div(PRECISION).sub(userInfo.rewardDebt);
        }

        await nurses.addNurseType([5, 5, 5, 5], [1000, 2000, 3000, 4000], [5, 10, 15, 20], [100, 100, 100, 100]);
        await nurses.connect(alice).assemble(0, 10); //nurse0-alice
        await nurses.connect(dan).assemble(1, 10); //nurse1-dan
        await nurses.connect(erin).assemble(2, 10); //nurse2-erin
        await nurses.connect(erin).assemble(0, 10); //nurse3-erin
        await nurses.connect(erin).assemble(1, 10); //nurse4-erin

        await expect(theMaster.connect(alice).support(1, 100, 0)).to.be.revertedWith("TheMaster: Use deposit func");
        await expect(theMaster.connect(alice).support(2, 100, 0)).to.be.revertedWith("TheMaster: Use deposit func");
        await expect(theMaster.connect(alice).support(3, 100, 5)).to.be.revertedWith("CloneNurses: Invalid target");

        const aliceInfo = new UserInfo(0, 0);
        const bobInfo = new UserInfo(0, 0);
        const carolInfo = new UserInfo(0, 0);

        await theMaster.set([1, 3], [60, 0]);
        pool3.set(0);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(theMaster.connect(alice).support(3, 100, 0))
            .to.emit(nurses, "SupportTo")
            .withArgs(alice.address, 0);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        expect(await nurses.supportingTo(alice.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, 900, 0);
        await expect(theMaster.connect(bob).support(3, 900, 1)).to.emit(nurses, "SupportTo").withArgs(bob.address, 1);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);
        expect(await getBlock()).to.be.lt(START_BLOCK);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(theMaster.connect(alice).support(3, 100, 2))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(0, 100);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        expect(await nurses.supportingTo(alice.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, -100, 0);
        await expect(theMaster.connect(bob).desupport(3, 100))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(1, -100);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, -800, 0);
        await expect(theMaster.connect(bob).desupport(3, 800))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(1, -800);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);

        await updateInfo(3, pool3, bobInfo, 700, 0);
        await expect(theMaster.connect(bob).support(3, 700, 2)).to.emit(nurses, "SupportTo").withArgs(bob.address, 2);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(2);
        //alice - n0(A) - 200
        //bob - n2(E) - 700

        await mineTo(START_BLOCK);
        await autoMining(false);
        await updateInfo(3, pool3, carolInfo, 1000, 0);
        await theMaster.connect(carol).support(3, 1000, 0);
        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await theMaster.connect(alice).support(3, 100, 0);
        await updateInfo(3, pool3, bobInfo, 900, 0);
        await theMaster.connect(bob).support(3, 900, 2);
        await mine();
        await autoMining(true);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        await checkUpdating(pool3, bobInfo, 3, bob);
        await checkUpdating(pool3, carolInfo, 3, carol);
        //carol - n0(A)

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);
        expect(await coin.balanceOf(carol.address)).to.be.equal(0);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(() => theMaster.connect(alice).support(3, 100, 0)).to.changeTokenBalance(coin, alice, Zero);
        await checkUpdating(pool3, aliceInfo, 3, alice);

        await expect(theMaster.connect(alice).desupport(1, 100)).to.be.revertedWith("TheMaster: Use withdraw func");
        await expect(theMaster.connect(alice).desupport(2, 100)).to.be.revertedWith("TheMaster: Use withdraw func");
        await expect(theMaster.connect(alice).desupport(3, 1000)).to.be.revertedWith("TheMaster: Insufficient amount");

        await mineTo(400);
        await theMaster.set([1, 3], [9, 51]);
        pool3.update(400, 0, 0);

        await mineTo(500);
        let incA = await balanceInc(3, pool3, aliceInfo, 0);
        let incB = await balanceInc(3, pool3, bobInfo, 0);
        let incC = await balanceInc(3, pool3, carolInfo, 0);
        let supFromA = incA.div(10);
        let supFromB = incB.div(10);
        let supFromC = incC.div(10);

        await autoMining(false);
        await updateInfo(3, pool3, aliceInfo, -200, 0);
        await theMaster.connect(alice).desupport(3, 200);
        await updateInfo(3, pool3, bobInfo, -100, 0);
        await theMaster.connect(bob).desupport(3, 100);
        await updateInfo(3, pool3, carolInfo, 3000, 0);
        await theMaster.connect(carol).support(3, 3000, 0);
        await expect(() => mine()).to.changeTokenBalances(
            coin,
            [alice, bob, carol, erin],
            [incA.sub(supFromA).add(supFromA.add(supFromC)), incB.sub(supFromB), incC.sub(supFromC), supFromB]
        );
        await autoMining(true);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        await checkUpdating(pool3, bobInfo, 3, bob);
        await checkUpdating(pool3, carolInfo, 3, carol);

        let totalR0 = supFromA.add(supFromC);
        let totalR1 = Zero;
        let totalR2 = supFromB;
        let totalR3 = Zero;
        let totalR4 = Zero;

        expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
        expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
        expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

        await expect(theMaster.connect(carol).emergencyDesupport(1)).to.be.revertedWith(
            "TheMaster: Use emergencyWithdraw func"
        );
        await expect(theMaster.connect(carol).emergencyDesupport(2)).to.be.revertedWith(
            "TheMaster: Use emergencyWithdraw func"
        );

        expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount.add(carolInfo.amount));

        let balC = await coin.balanceOf(carol.address);
        let amountC = carolInfo.amount;
        await expect(theMaster.connect(carol).emergencyDesupport(3))
            .to.emit(theMaster, "EmergencyDesupport")
            .withArgs(carol.address, 3, amountC);
        carolInfo.update(amountC.mul(-1), Zero);
        pool3.update(0, amountC.mul(-1), 0);
        await checkUpdating(pool3, carolInfo, 3, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);

        await mine(10);

        await updateInfo(3, pool3, carolInfo, 12340, 0);
        await expect(theMaster.connect(carol).support(3, 12340, 4))
            .to.emit(nurses, "SupportTo")
            .withArgs(carol.address, 4);
        await checkUpdating(pool3, carolInfo, 3, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);
        //carol - n4(E)

        expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
        expect(await nurses.supportedPower(1)).to.be.equal(0);
        expect(await nurses.supportedPower(2)).to.be.equal(bobInfo.amount);
        expect(await nurses.supportedPower(3)).to.be.equal(0);
        expect(await nurses.supportedPower(4)).to.be.equal(carolInfo.amount);

        // 5200
        await mineTo(START_BLOCK + 5190);

        incA = await balanceInc(3, pool3, aliceInfo, 0);
        supFromA = incA.div(10);
        await updateInfo(3, pool3, aliceInfo, 0, 0);
        await expect(() => theMaster.connect(alice).support(3, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA.sub(supFromA).add(supFromA)
        );
        await checkUpdating(pool3, aliceInfo, 3, alice);

        incB = await balanceInc(3, pool3, bobInfo, 0);
        supFromB = incB.div(10);
        await updateInfo(3, pool3, bobInfo, 0, 0);
        await expect(() => theMaster.connect(bob).support(3, 0, bob.address)).to.changeTokenBalances(
            coin,
            [bob, erin],
            [incB.sub(supFromB), supFromB]
        );
        await checkUpdating(pool3, bobInfo, 3, bob);

        totalR0 = totalR0.add(supFromA);
        totalR1 = Zero;
        totalR2 = totalR2.add(supFromB);
        totalR3 = Zero;
        totalR4 = Zero;
        expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
        expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
        expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

        await mine(10);
        const newRewardPerBlock = INITIAL_REWARD_PER_BLOCK.div(2);
        incA = await balanceInc(3, pool3, aliceInfo, newRewardPerBlock);
        supFromA = incA.div(10);
        await updateInfo(3, pool3, aliceInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(alice).support(3, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA.sub(supFromA).add(supFromA)
        );
        await checkUpdating(pool3, aliceInfo, 3, alice);

        {
            totalR0 = totalR0.add(supFromA);
            totalR1 = Zero;
            totalR2 = totalR2;
            totalR3 = Zero;
            totalR4 = Zero;
            expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
            expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
            expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
            expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
            expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

            expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
            expect(await nurses.supportedPower(1)).to.be.equal(0);
            expect(await nurses.supportedPower(2)).to.be.equal(bobInfo.amount);
            expect(await nurses.supportedPower(3)).to.be.equal(0);
            expect(await nurses.supportedPower(4)).to.be.equal(carolInfo.amount);

            expect(await nurses.supportingRoute(0)).to.be.equal(0);
            expect(await nurses.supportingRoute(1)).to.be.equal(1);
            expect(await nurses.supportingRoute(2)).to.be.equal(2);
            expect(await nurses.supportingRoute(3)).to.be.equal(3);
            expect(await nurses.supportingRoute(4)).to.be.equal(4);

            expect(await nurses.supportingTo(alice.address)).to.be.equal(0);
            expect(await nurses.supportingTo(bob.address)).to.be.equal(2);
            expect(await nurses.supportingTo(carol.address)).to.be.equal(4);
        }

        await nurses.connect(erin).destroy([4, 3, 2], [3, 1, 1]);

        {
            totalR0 = totalR0;
            totalR1 = Zero;
            totalR2 = totalR2;
            totalR3 = Zero;
            totalR4 = Zero;
            expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
            expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(Zero); //totalReward is not changed with destruction
            expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2); //totalReward is not changed with destruction
            expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(Zero);
            expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(Zero);

            expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
            expect(await nurses.supportedPower(1)).to.be.equal(bobInfo.amount.add(carolInfo.amount));
            expect(await nurses.supportedPower(2)).to.be.equal(0);
            expect(await nurses.supportedPower(3)).to.be.equal(0);
            expect(await nurses.supportedPower(4)).to.be.equal(0);

            expect(await nurses.supportingRoute(0)).to.be.equal(0);
            expect(await nurses.supportingRoute(1)).to.be.equal(1);
            expect(await nurses.supportingRoute(2)).to.be.equal(1);
            expect(await nurses.supportingRoute(3)).to.be.equal(1);
            expect(await nurses.supportingRoute(4)).to.be.equal(3); //route is not changed consecutively with serial destruction

            expect(await nurses.supportingTo(alice.address)).to.be.equal(0);
            expect(await nurses.supportingTo(bob.address)).to.be.equal(2); //supportingTo is not changed by itself
            expect(await nurses.supportingTo(carol.address)).to.be.equal(4); //supportingTo is not changed by itself
        }

        incB = await balanceInc(3, pool3, bobInfo, newRewardPerBlock);
        supFromB = incB.div(10);
        await updateInfo(3, pool3, bobInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(bob).support(3, 0, bob.address)).to.changeTokenBalances(
            coin,
            [bob, dan],
            [incB.sub(supFromB), supFromB]
        );
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(supFromB); //totalReward is not changed with destruction
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2); //totalReward is not changed with destruction
        expect(await nurses.supportedPower(1)).to.be.equal(bobInfo.amount.add(carolInfo.amount));
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1); //it's changed now

        await nurses.connect(alice).checkSupportingRoute(carol.address);
        expect(await nurses.supportingRoute(4)).to.be.equal(1); //route is changed when checkSupportingRoute function is called
        expect(await nurses.supportingTo(carol.address)).to.be.equal(1); //it's changed now
    });

    it("should be that deposit/withdraw/emergencyWithdraw function works exactly samely with sushiMasterChef-1", async function () {
        const { alice, bob, carol, sushi, sushiMC, coin, theMaster } = await setupTest();

        const pool1 = new PoolInfo(9, START_BLOCK);

        async function updateInfo(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            amount: BigNumberish,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            const rewardBlock = (await getBlock()) >= START_BLOCK ? (await getBlock()) + 1 : START_BLOCK;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accRewardPerShare).div(PRECISION);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolInfo, userInfo: UserInfo, poolId: number, user: SignerWithAddress) {
            expect((await theMaster.poolInfo(poolId))[5]).to.be.equal(poolInfo.lastRewardBlock);
            expect((await theMaster.poolInfo(poolId))[6]).to.be.equal(poolInfo.accRewardPerShare);

            expect((await theMaster.userInfo(poolId, user.address))[0]).to.be.equal(userInfo.amount);
            expect((await theMaster.userInfo(poolId, user.address))[1]).to.be.equal(userInfo.rewardDebt);
        }

        async function balanceInc(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            let rewardBlock;
            if ((await getBlock()) < START_BLOCK) return 0;
            else rewardBlock = (await getBlock()) + 1;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accRewardPerShare.add(accInc)).div(PRECISION).sub(userInfo.rewardDebt);
        }

        const aliceInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        const bobInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);
        expect(await getBlock()).to.be.lt(START_BLOCK);

        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(1, pool1, bobInfo, -800, 0);
        await theMaster.connect(bob).withdraw(1, 800, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await updateInfo(1, pool1, bobInfo, 700, 0);
        await theMaster.connect(bob).deposit(1, 700, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mineTo(START_BLOCK);
        await autoMining(false);
        const carolInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, carolInfo, 1000, 0);
        await theMaster.connect(carol).deposit(1, 1000, carol.address);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await mine();
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);
        expect(await coin.balanceOf(carol.address)).to.be.equal(0);

        await sushi.transferOwnership(sushiMC.address);
        await theMaster.setSushiMasterChef(sushiMC.address, 3);
        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(pool1.totalSupply);

        let incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await expect(() => theMaster.connect(alice).deposit(1, 100, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await mineTo(500);
        incA = await balanceInc(1, pool1, aliceInfo, 0);
        let incB = await balanceInc(1, pool1, bobInfo, 0);
        let incC = await balanceInc(1, pool1, carolInfo, 0);
        await autoMining(false);
        await updateInfo(1, pool1, aliceInfo, -200, 0);
        await theMaster.connect(alice).withdraw(1, 200, alice.address);
        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await updateInfo(1, pool1, carolInfo, 3000, 0);
        await theMaster.connect(carol).deposit(1, 3000, carol.address);
        await expect(() => mine()).to.changeTokenBalances(coin, [alice, bob, carol], [incA, incB, incC]);
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        let balC = await coin.balanceOf(carol.address);
        let amountC = carolInfo.amount;
        await expect(theMaster.connect(carol).emergencyWithdraw(1))
            .to.emit(theMaster, "EmergencyWithdraw")
            .withArgs(carol.address, 1, amountC);
        carolInfo.update(amountC.mul(-1), Zero);
        pool1.update(0, amountC.mul(-1), 0);
        await checkUpdating(pool1, carolInfo, 1, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);

        // 5200
        await mineTo(START_BLOCK + 5190);

        incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 0, 0);
        await expect(() => theMaster.connect(alice).deposit(1, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, 0);
        await updateInfo(1, pool1, bobInfo, 0, 0);
        await expect(() => theMaster.connect(bob).deposit(1, 0, bob.address)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mine(10);
        const newRewardPerBlock = INITIAL_REWARD_PER_BLOCK.div(2);
        incA = await balanceInc(1, pool1, aliceInfo, newRewardPerBlock);
        await updateInfo(1, pool1, aliceInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(alice).deposit(1, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, newRewardPerBlock);
        await updateInfo(1, pool1, bobInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(bob).deposit(1, 0, bob.address)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);
    });

    it("should be that deposit/withdraw/emergencyWithdraw function works exactly samely with sushiMasterChef-2", async function () {
        const { alice, bob, carol, sushi, sushiMC, coin, theMaster } = await setupTest();

        const pool1 = new PoolInfo(9, START_BLOCK);

        async function updateInfo(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            amount: BigNumberish,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            const rewardBlock = (await getBlock()) >= START_BLOCK ? (await getBlock()) + 1 : START_BLOCK;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accRewardPerShare).div(PRECISION);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolInfo, userInfo: UserInfo, poolId: number, user: SignerWithAddress) {
            expect((await theMaster.poolInfo(poolId))[5]).to.be.equal(poolInfo.lastRewardBlock);
            expect((await theMaster.poolInfo(poolId))[6]).to.be.equal(poolInfo.accRewardPerShare);

            expect((await theMaster.userInfo(poolId, user.address))[0]).to.be.equal(userInfo.amount);
            expect((await theMaster.userInfo(poolId, user.address))[1]).to.be.equal(userInfo.rewardDebt);
        }

        async function balanceInc(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            let rewardBlock;
            if ((await getBlock()) < START_BLOCK) return 0;
            else rewardBlock = (await getBlock()) + 1;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accRewardPerShare.add(accInc)).div(PRECISION).sub(userInfo.rewardDebt);
        }

        const aliceInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        const bobInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);
        expect(await getBlock()).to.be.lt(START_BLOCK);

        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(1, pool1, bobInfo, -800, 0);
        await theMaster.connect(bob).withdraw(1, 800, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await updateInfo(1, pool1, bobInfo, 700, 0);
        await theMaster.connect(bob).deposit(1, 700, bob.address);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mineTo(START_BLOCK);
        await autoMining(false);
        const carolInfo = new UserInfo(0, 0);
        await updateInfo(1, pool1, carolInfo, 1000, 0);
        await theMaster.connect(carol).deposit(1, 1000, carol.address);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await updateInfo(1, pool1, bobInfo, 900, 0);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await mine();
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);
        expect(await coin.balanceOf(carol.address)).to.be.equal(0);

        let incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 100, 0);
        await expect(() => theMaster.connect(alice).deposit(1, 100, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        await sushi.transferOwnership(sushiMC.address);

        await mineTo(500);
        incA = await balanceInc(1, pool1, aliceInfo, 0);
        let incB = await balanceInc(1, pool1, bobInfo, 0);
        let incC = await balanceInc(1, pool1, carolInfo, 0);
        await autoMining(false);
        await updateInfo(1, pool1, aliceInfo, -200, 0);
        await theMaster.connect(alice).withdraw(1, 200, alice.address);
        await updateInfo(1, pool1, bobInfo, -100, 0);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await theMaster.setSushiMasterChef(sushiMC.address, 3); //between deposit/withdraw transaction.
        await updateInfo(1, pool1, carolInfo, 3000, 0);
        await theMaster.connect(carol).deposit(1, 3000, carol.address);
        await expect(() => mine()).to.changeTokenBalances(coin, [alice, bob, carol], [incA, incB, incC]);
        await autoMining(true);
        await checkUpdating(pool1, aliceInfo, 1, alice);
        await checkUpdating(pool1, bobInfo, 1, bob);
        await checkUpdating(pool1, carolInfo, 1, carol);

        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(pool1.totalSupply);

        let balC = await coin.balanceOf(carol.address);
        let amountC = carolInfo.amount;
        await expect(theMaster.connect(carol).emergencyWithdraw(1))
            .to.emit(theMaster, "EmergencyWithdraw")
            .withArgs(carol.address, 1, amountC);
        carolInfo.update(amountC.mul(-1), Zero);
        pool1.update(0, amountC.mul(-1), 0);
        await checkUpdating(pool1, carolInfo, 1, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);

        // 5200
        await mineTo(START_BLOCK + 5190);

        incA = await balanceInc(1, pool1, aliceInfo, 0);
        await updateInfo(1, pool1, aliceInfo, 0, 0);
        await expect(() => theMaster.connect(alice).claimAllReward(1)).to.changeTokenBalance(coin, alice, incA);
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, 0);
        await updateInfo(1, pool1, bobInfo, 0, 0);
        await expect(() => theMaster.connect(bob).claimAllReward(1)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await mine(10);
        const newRewardPerBlock = INITIAL_REWARD_PER_BLOCK.div(2);
        incA = await balanceInc(1, pool1, aliceInfo, newRewardPerBlock);
        await updateInfo(1, pool1, aliceInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(alice).deposit(1, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA
        );
        await checkUpdating(pool1, aliceInfo, 1, alice);

        incB = await balanceInc(1, pool1, bobInfo, newRewardPerBlock);
        await updateInfo(1, pool1, bobInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(bob).deposit(1, 0, bob.address)).to.changeTokenBalance(coin, bob, incB);
        await checkUpdating(pool1, bobInfo, 1, bob);

        await theMaster.connect(alice).withdraw(1, aliceInfo.amount, alice.address);
        await theMaster.connect(bob).withdraw(1, bobInfo.amount, bob.address);
        await theMaster.connect(carol).withdraw(1, carolInfo.amount, carol.address);
        expect((await theMaster.poolInfo(1))[7]).to.be.equal(0);
        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(0);
        // await theMaster.connect(alice).emergencyWithdraw(1);
        // await theMaster.connect(bob).emergencyWithdraw(1);
        // await theMaster.connect(carol).emergencyWithdraw(1);
        // expect((await theMaster.poolInfo(1))[7]).to.be.equal(0);
        // expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(0);
        //withdraw works well
    });

    it("should be that support/desupport/emergencyDesupport function works exactly samely with sushiMasterChef", async function () {
        const { alice, bob, carol, dan, erin, sushi, sushiMC, coin, theMaster, nurses } = await setupTest();

        const pool3 = new PoolInfo(51, START_BLOCK);

        async function updateInfo(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            amount: BigNumberish,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            const rewardBlock = (await getBlock()) >= START_BLOCK ? (await getBlock()) + 1 : START_BLOCK;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accRewardPerShare).div(PRECISION);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolInfo, userInfo: UserInfo, poolId: number, user: SignerWithAddress) {
            expect((await theMaster.poolInfo(poolId))[5]).to.be.equal(poolInfo.lastRewardBlock);
            expect((await theMaster.poolInfo(poolId))[6]).to.be.equal(poolInfo.accRewardPerShare);

            expect((await theMaster.userInfo(poolId, user.address))[0]).to.be.equal(userInfo.amount);
            expect((await theMaster.userInfo(poolId, user.address))[1]).to.be.equal(userInfo.rewardDebt);
        }

        async function balanceInc(
            poolId: number,
            poolInfo: PoolInfo,
            userInfo: UserInfo,
            rewardPerBlock: BigNumberish
        ) {
            const rpb = rewardPerBlock === 0 ? INITIAL_REWARD_PER_BLOCK : BigNumber.from(rewardPerBlock);
            let rewardBlock;
            if ((await getBlock()) < START_BLOCK) return Zero;
            else rewardBlock = (await getBlock()) + 1;
            const reward = rpb
                .mul(rewardBlock - poolInfo.lastRewardBlock)
                .mul((await theMaster.poolInfo(poolId))[4])
                .div(await theMaster.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(PRECISION).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accRewardPerShare.add(accInc)).div(PRECISION).sub(userInfo.rewardDebt);
        }

        await nurses.addNurseType([5, 5, 5, 5], [1000, 2000, 3000, 4000], [5, 10, 15, 20], [100, 100, 100, 100]);
        await nurses.connect(alice).assemble(0, 10); //nurse0-alice
        await nurses.connect(dan).assemble(1, 10); //nurse1-dan
        await nurses.connect(erin).assemble(2, 10); //nurse2-erin
        await nurses.connect(erin).assemble(0, 10); //nurse3-erin
        await nurses.connect(erin).assemble(1, 10); //nurse4-erin

        const aliceInfo = new UserInfo(0, 0);
        const bobInfo = new UserInfo(0, 0);
        const carolInfo = new UserInfo(0, 0);

        await theMaster.set([1, 3], [60, 0]);
        pool3.set(0);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(theMaster.connect(alice).support(3, 100, 0))
            .to.emit(nurses, "SupportTo")
            .withArgs(alice.address, 0);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        expect(await nurses.supportingTo(alice.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, 900, 0);
        await expect(theMaster.connect(bob).support(3, 900, 1)).to.emit(nurses, "SupportTo").withArgs(bob.address, 1);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);
        expect(await getBlock()).to.be.lt(START_BLOCK);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(theMaster.connect(alice).support(3, 100, 2))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(0, 100);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        expect(await nurses.supportingTo(alice.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, -100, 0);
        await expect(theMaster.connect(bob).desupport(3, 100))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(1, -100);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(3, pool3, bobInfo, -800, 0);
        await expect(theMaster.connect(bob).desupport(3, 800))
            .to.emit(nurses, "ChangeSupportedPower")
            .withArgs(1, -800);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1);

        await updateInfo(3, pool3, bobInfo, 700, 0);
        await expect(theMaster.connect(bob).support(3, 700, 2)).to.emit(nurses, "SupportTo").withArgs(bob.address, 2);
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.supportingTo(bob.address)).to.be.equal(2);
        //alice - n0(A) - 200
        //bob - n2(E) - 700

        await mineTo(START_BLOCK);
        await autoMining(false);
        await updateInfo(3, pool3, carolInfo, 1000, 0);
        await theMaster.connect(carol).support(3, 1000, 0);
        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await theMaster.connect(alice).support(3, 100, 0);
        await updateInfo(3, pool3, bobInfo, 900, 0);
        await theMaster.connect(bob).support(3, 900, 2);
        await mine();
        await autoMining(true);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        await checkUpdating(pool3, bobInfo, 3, bob);
        await checkUpdating(pool3, carolInfo, 3, carol);
        //carol - n0(A)

        expect(await coin.balanceOf(alice.address)).to.be.equal(0);
        expect(await coin.balanceOf(bob.address)).to.be.equal(0);
        expect(await coin.balanceOf(carol.address)).to.be.equal(0);

        await updateInfo(3, pool3, aliceInfo, 100, 0);
        await expect(() => theMaster.connect(alice).support(3, 100, 0)).to.changeTokenBalance(coin, alice, Zero);
        await checkUpdating(pool3, aliceInfo, 3, alice);

        await mineTo(400);
        await theMaster.set([1, 3], [9, 51]);
        pool3.update(400, 0, 0);

        await sushi.transferOwnership(sushiMC.address);

        await mineTo(500);
        let incA = await balanceInc(3, pool3, aliceInfo, 0);
        let incB = await balanceInc(3, pool3, bobInfo, 0);
        let incC = await balanceInc(3, pool3, carolInfo, 0);
        let supFromA = incA.div(10);
        let supFromB = incB.div(10);
        let supFromC = incC.div(10);

        await autoMining(false);
        await updateInfo(3, pool3, aliceInfo, -200, 0);
        await theMaster.connect(alice).desupport(3, 200);
        await updateInfo(3, pool3, bobInfo, -100, 0);
        await theMaster.connect(bob).desupport(3, 100);
        await theMaster.setSushiMasterChef(sushiMC.address, 3);
        await updateInfo(3, pool3, carolInfo, 3000, 0);
        await theMaster.connect(carol).support(3, 3000, 0);
        await expect(() => mine()).to.changeTokenBalances(
            coin,
            [alice, bob, carol, erin],
            [incA.sub(supFromA).add(supFromA.add(supFromC)), incB.sub(supFromB), incC.sub(supFromC), supFromB]
        );
        await autoMining(true);
        await checkUpdating(pool3, aliceInfo, 3, alice);
        await checkUpdating(pool3, bobInfo, 3, bob);
        await checkUpdating(pool3, carolInfo, 3, carol);

        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(pool3.totalSupply);

        let totalR0 = supFromA.add(supFromC);
        let totalR1 = Zero;
        let totalR2 = supFromB;
        let totalR3 = Zero;
        let totalR4 = Zero;

        expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
        expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
        expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

        expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount.add(carolInfo.amount));

        let balC = await coin.balanceOf(carol.address);
        let amountC = carolInfo.amount;
        await expect(theMaster.connect(carol).emergencyDesupport(3))
            .to.emit(theMaster, "EmergencyDesupport")
            .withArgs(carol.address, 3, amountC);
        carolInfo.update(amountC.mul(-1), Zero);
        pool3.update(0, amountC.mul(-1), 0);
        await checkUpdating(pool3, carolInfo, 3, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);

        await mine(10);

        await updateInfo(3, pool3, carolInfo, 12340, 0);
        await expect(theMaster.connect(carol).support(3, 12340, 4))
            .to.emit(nurses, "SupportTo")
            .withArgs(carol.address, 4);
        await checkUpdating(pool3, carolInfo, 3, carol);
        expect(await coin.balanceOf(carol.address)).to.be.equal(balC);
        //carol - n4(E)

        expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
        expect(await nurses.supportedPower(1)).to.be.equal(0);
        expect(await nurses.supportedPower(2)).to.be.equal(bobInfo.amount);
        expect(await nurses.supportedPower(3)).to.be.equal(0);
        expect(await nurses.supportedPower(4)).to.be.equal(carolInfo.amount);

        // 5200
        await mineTo(START_BLOCK + 5190);

        incA = await balanceInc(3, pool3, aliceInfo, 0);
        supFromA = incA.div(10);
        await updateInfo(3, pool3, aliceInfo, 0, 0);
        await expect(() => theMaster.connect(alice).claimAllReward(3)).to.changeTokenBalance(
            coin,
            alice,
            incA.sub(supFromA).add(supFromA)
        );
        await checkUpdating(pool3, aliceInfo, 3, alice);

        incB = await balanceInc(3, pool3, bobInfo, 0);
        supFromB = incB.div(10);
        await updateInfo(3, pool3, bobInfo, 0, 0);
        await expect(() => theMaster.connect(bob).claimAllReward(3)).to.changeTokenBalances(
            coin,
            [bob, erin],
            [incB.sub(supFromB), supFromB]
        );
        await checkUpdating(pool3, bobInfo, 3, bob);

        totalR0 = totalR0.add(supFromA);
        totalR1 = Zero;
        totalR2 = totalR2.add(supFromB);
        totalR3 = Zero;
        totalR4 = Zero;
        expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
        expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
        expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

        await mine(10);
        const newRewardPerBlock = INITIAL_REWARD_PER_BLOCK.div(2);
        incA = await balanceInc(3, pool3, aliceInfo, newRewardPerBlock);
        supFromA = incA.div(10);
        await updateInfo(3, pool3, aliceInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(alice).support(3, 0, alice.address)).to.changeTokenBalance(
            coin,
            alice,
            incA.sub(supFromA).add(supFromA)
        );
        await checkUpdating(pool3, aliceInfo, 3, alice);

        {
            totalR0 = totalR0.add(supFromA);
            totalR1 = Zero;
            totalR2 = totalR2;
            totalR3 = Zero;
            totalR4 = Zero;
            expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
            expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(totalR1);
            expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2);
            expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(totalR3);
            expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(totalR4);

            expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
            expect(await nurses.supportedPower(1)).to.be.equal(0);
            expect(await nurses.supportedPower(2)).to.be.equal(bobInfo.amount);
            expect(await nurses.supportedPower(3)).to.be.equal(0);
            expect(await nurses.supportedPower(4)).to.be.equal(carolInfo.amount);

            expect(await nurses.supportingRoute(0)).to.be.equal(0);
            expect(await nurses.supportingRoute(1)).to.be.equal(1);
            expect(await nurses.supportingRoute(2)).to.be.equal(2);
            expect(await nurses.supportingRoute(3)).to.be.equal(3);
            expect(await nurses.supportingRoute(4)).to.be.equal(4);

            expect(await nurses.supportingTo(alice.address)).to.be.equal(0);
            expect(await nurses.supportingTo(bob.address)).to.be.equal(2);
            expect(await nurses.supportingTo(carol.address)).to.be.equal(4);
        }

        await nurses.connect(erin).destroy([4, 3, 2], [3, 1, 1]);

        {
            totalR0 = totalR0;
            totalR1 = Zero;
            totalR2 = totalR2;
            totalR3 = Zero;
            totalR4 = Zero;
            expect(await nurses.totalRewardsFromSupporters(0)).to.be.equal(totalR0);
            expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(Zero); //totalReward is not changed with destruction
            expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2); //totalReward is not changed with destruction
            expect(await nurses.totalRewardsFromSupporters(3)).to.be.equal(Zero);
            expect(await nurses.totalRewardsFromSupporters(4)).to.be.equal(Zero);

            expect(await nurses.supportedPower(0)).to.be.equal(aliceInfo.amount);
            expect(await nurses.supportedPower(1)).to.be.equal(bobInfo.amount.add(carolInfo.amount));
            expect(await nurses.supportedPower(2)).to.be.equal(0);
            expect(await nurses.supportedPower(3)).to.be.equal(0);
            expect(await nurses.supportedPower(4)).to.be.equal(0);

            expect(await nurses.supportingRoute(0)).to.be.equal(0);
            expect(await nurses.supportingRoute(1)).to.be.equal(1);
            expect(await nurses.supportingRoute(2)).to.be.equal(1);
            expect(await nurses.supportingRoute(3)).to.be.equal(1);
            expect(await nurses.supportingRoute(4)).to.be.equal(3); //route is not changed consecutively with serial destruction

            expect(await nurses.supportingTo(alice.address)).to.be.equal(0);
            expect(await nurses.supportingTo(bob.address)).to.be.equal(2); //supportingTo is not changed by itself
            expect(await nurses.supportingTo(carol.address)).to.be.equal(4); //supportingTo is not changed by itself
        }

        incB = await balanceInc(3, pool3, bobInfo, newRewardPerBlock);
        supFromB = incB.div(10);
        await updateInfo(3, pool3, bobInfo, 0, newRewardPerBlock);
        await expect(() => theMaster.connect(bob).support(3, 0, bob.address)).to.changeTokenBalances(
            coin,
            [bob, dan],
            [incB.sub(supFromB), supFromB]
        );
        await checkUpdating(pool3, bobInfo, 3, bob);
        expect(await nurses.totalRewardsFromSupporters(1)).to.be.equal(supFromB); //totalReward is not changed with destruction
        expect(await nurses.totalRewardsFromSupporters(2)).to.be.equal(totalR2); //totalReward is not changed with destruction
        expect(await nurses.supportedPower(1)).to.be.equal(bobInfo.amount.add(carolInfo.amount));
        expect(await nurses.supportingTo(bob.address)).to.be.equal(1); //it's changed now

        await nurses.connect(alice).checkSupportingRoute(carol.address);
        expect(await nurses.supportingRoute(4)).to.be.equal(1); //route is changed when checkSupportingRoute function is called
        expect(await nurses.supportingTo(carol.address)).to.be.equal(1); //it's changed now

        // await theMaster.connect(alice).desupport(3, aliceInfo.amount);
        // await theMaster.connect(bob).desupport(3, bobInfo.amount);
        // await theMaster.connect(carol).desupport(3, carolInfo.amount);
        // expect((await theMaster.poolInfo(3))[7]).to.be.equal(0);
        // expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(0);
        await theMaster.connect(alice).emergencyDesupport(3);
        await theMaster.connect(bob).emergencyDesupport(3);
        await theMaster.connect(carol).emergencyDesupport(3);
        expect((await theMaster.poolInfo(3))[7]).to.be.equal(0);
        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(0);
        //desupport works well
    });

    it("should be that deposit/withdraw/emergencyWithdraw/claim function with sushiMasterChef distribute Sushi rewards properly", async function () {
        const { alice, bob, carol, theMaster, sushi, sushiMC } = await setupTest();
        const e18 = BigNumber.from(10).pow(18);

        class UserSushiInfo {
            pid: number;
            userInfo: UserInfo;

            constructor(pid: number, amount: BigNumberish, rewardDebt: BigNumberish) {
                this.pid = pid;
                this.userInfo = new UserInfo(amount, rewardDebt);
            }
        }

        class PoolSushiInfo {
            allocPoint: number;
            lastRewardBlock: number;
            accSushiPerShare: BigNumber;
            totalSupply: BigNumber;

            constructor(allocPoint: number, lastRewardBlock: number) {
                this.allocPoint = allocPoint;
                this.lastRewardBlock = lastRewardBlock;
                this.accSushiPerShare = Zero;
                this.totalSupply = Zero;
            }
            set(_allocPoint: number) {
                this.allocPoint = _allocPoint;
            }
            update(block: number, amount: BigNumberish, _accSushiPerShare: BigNumberish) {
                if (this.lastRewardBlock < block) {
                    this.lastRewardBlock = block;
                    this.accSushiPerShare = BigNumber.from(this.accSushiPerShare).add(_accSushiPerShare);
                }
                this.totalSupply = BigNumber.from(this.totalSupply).add(amount);
                if (this.totalSupply.lt(0)) throw "totalSupply < 0";
            }
        }

        const sushiPool = new PoolSushiInfo(10, 305);

        async function updateInfo(
            poolInfo: PoolSushiInfo,
            userInfo: UserInfo,
            sushiPid: number,
            amount: BigNumberish,
            rewardOn: boolean
        ) {
            const reward =
                rewardOn === true
                    ? tokenAmount(100)
                          .mul((await getBlock()) + 1 - poolInfo.lastRewardBlock)
                          .mul((await sushiMC.poolInfo(sushiPid))[1])
                          .div(await sushiMC.totalAllocPoint())
                    : Zero;
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(e18).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accSushiPerShare).div(e18);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolSushiInfo, sushiPid: number) {
            expect(await theMaster.sushiLastRewardBlock()).to.be.equal(poolInfo.lastRewardBlock);
            expect((await sushiMC.poolInfo(sushiPid))[2]).to.be.equal(poolInfo.lastRewardBlock);

            //allow a difference within 0.001%
            const acc = poolInfo.accSushiPerShare.div(1000000); //unify precision
            expect((await sushiMC.poolInfo(sushiPid))[3]).to.be.lte(acc.mul(100001).div(100000));
            expect((await sushiMC.poolInfo(sushiPid))[3]).to.be.gte(acc.mul(99999).div(100000));
            expect(await theMaster.accSushiPerShare()).to.be.lte(poolInfo.accSushiPerShare.mul(100001).div(100000));
            expect(await theMaster.accSushiPerShare()).to.be.gte(poolInfo.accSushiPerShare.mul(99999).div(100000));

            expect((await sushiMC.userInfo(sushiPid, theMaster.address))[0]).to.be.equal(poolInfo.totalSupply);
            // console.log("total lp deposit", poolInfo.totalSupply.toString());
        }

        async function balanceInc(poolInfo: PoolSushiInfo, userInfo: UserInfo, sushiPid: number) {
            const reward = tokenAmount(100)
                .mul((await getBlock()) + 1 - poolInfo.lastRewardBlock)
                .mul((await sushiMC.poolInfo(sushiPid))[1])
                .div(await sushiMC.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(e18).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accSushiPerShare.add(accInc)).div(e18).sub(userInfo.rewardDebt);
        }

        async function checkSushiReward(user: SignerWithAddress, balanceInc: BigNumber) {
            const events = await sushi.queryFilter(
                sushi.filters.Transfer(theMaster.address, user.address, null),
                "latest"
            );
            const event = events[0];
            const transferedReward = event === undefined ? Zero : event.args[2];
            // console.log("transfered sushi", transferedReward.toString());
            //allow a difference within 0.001%
            expect(balanceInc).to.be.lte(transferedReward.mul(100001).div(100000));
            expect(balanceInc).to.be.gte(transferedReward.mul(99999).div(100000));
        }

        const alice1Info = new UserSushiInfo(1, 0, 0);
        const bob1Info = new UserSushiInfo(1, 0, 0);
        const carol1Info = new UserSushiInfo(1, 0, 0);

        await updateInfo(sushiPool, alice1Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).deposit(1, 100, alice.address);

        await updateInfo(sushiPool, bob1Info.userInfo, 3, 900, false);
        await theMaster.connect(bob).deposit(1, 900, bob.address);

        await updateInfo(sushiPool, alice1Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).deposit(1, 100, alice.address);

        await updateInfo(sushiPool, bob1Info.userInfo, 3, -100, false);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);

        expect(await sushi.balanceOf(alice.address)).to.be.equal(0);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(sushiPool, bob1Info.userInfo, 3, -800, false);
        await theMaster.connect(bob).withdraw(1, 800, bob.address);

        await updateInfo(sushiPool, bob1Info.userInfo, 3, 700, false);
        await theMaster.connect(bob).deposit(1, 700, bob.address);

        await mineTo(START_BLOCK);
        await autoMining(false);
        await updateInfo(sushiPool, carol1Info.userInfo, 3, 1000, false);
        await theMaster.connect(carol).deposit(1, 1000, carol.address);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 900, false);
        await theMaster.connect(bob).deposit(1, 900, bob.address);
        await mine();
        await autoMining(true);

        expect(await sushi.balanceOf(alice.address)).to.be.equal(0);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);

        await sushi.transferOwnership(sushiMC.address);

        await mineTo(305);

        sushiPool.update((await getBlock()) + 1, Zero, 0);
        await theMaster.setSushiMasterChef(sushiMC.address, 3);
        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(sushiPool.totalSupply);

        // console.log(sushiPool);  2900
        // console.log(alice1Info.userInfo);  300
        // console.log(bob1Info.userInfo);    1600
        // console.log(carol1Info.userInfo);  1000

        let incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 100, true);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        await mineTo(500);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        let incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        let incC = await balanceInc(sushiPool, carol1Info.userInfo, 3);
        await autoMining(false);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, -200, true);
        await theMaster.connect(alice).withdraw(1, 200, alice.address);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, -100, true);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await updateInfo(sushiPool, carol1Info.userInfo, 3, 3000, true);
        await theMaster.connect(carol).deposit(1, 3000, carol.address);
        await mine();
        await autoMining(true);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);
        await checkSushiReward(bob, incB);
        await checkSushiReward(carol, incC);

        incC = await balanceInc(sushiPool, carol1Info.userInfo, 3);
        let amountC = carol1Info.userInfo.amount;
        await updateInfo(sushiPool, carol1Info.userInfo, 3, amountC.mul(-1), true);
        await expect(theMaster.connect(carol).emergencyWithdraw(1))
            .to.emit(theMaster, "EmergencyWithdraw")
            .withArgs(carol.address, 1, amountC);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, incC);

        // console.log((await sushi.balanceOf(alice.address)).toString());
        // console.log((await sushi.balanceOf(bob.address)).toString());
        // console.log((await sushi.balanceOf(carol.address)).toString());
        // console.log((await sushi.balanceOf(theMaster.address)).toString());

        // 5200
        await mineTo(START_BLOCK + 5190);

        let pendingIncA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).deposit(1, 0, alice.address); //deposit0 doesn't transfer sushi.

        let pendingIncB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).withdraw(1, 0, bob.address); //withdraw0 doesn't transfer sushi.

        //5500
        await mine(10);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimAllReward(1);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA.add(pendingIncA));

        incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimAllReward(1);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB.add(pendingIncB));

        await mine(20);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 300, true);
        await theMaster.connect(alice).deposit(1, 300, alice.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, -500, true);
        await theMaster.connect(bob).withdraw(1, 500, bob.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        await updateInfo(sushiPool, carol1Info.userInfo, 3, 1500, true);
        await theMaster.connect(carol).deposit(1, 1500, carol.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, Zero);

        await mine(123);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimSushiReward(1);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimSushiReward(1);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        await mine(2);
        incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimAllReward(1);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        incC = await balanceInc(sushiPool, carol1Info.userInfo, 3);
        await updateInfo(sushiPool, carol1Info.userInfo, 3, 300, true);
        await theMaster.connect(carol).deposit(1, 300, carol.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, incC);

        await mine(10);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        await updateInfo(sushiPool, alice1Info.userInfo, 3, -100, true);
        await theMaster.connect(alice).withdraw(1, 100, alice.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        await mine(50);
        await autoMining(false);
        incA = await balanceInc(sushiPool, alice1Info.userInfo, 3);
        incB = await balanceInc(sushiPool, bob1Info.userInfo, 3);
        incC = await balanceInc(sushiPool, carol1Info.userInfo, 3);

        await updateInfo(sushiPool, alice1Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimSushiReward(1);
        await updateInfo(sushiPool, bob1Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimSushiReward(1);
        await updateInfo(sushiPool, carol1Info.userInfo, 3, 0, true);
        await theMaster.connect(carol).claimAllReward(1);

        await mine();
        await autoMining(true);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);
        await checkSushiReward(bob, incB);
        await checkSushiReward(carol, incC);
    });

    it("should be that support/desupport/emergencyDesupport/claim function with sushiMasterChef distribute Sushi rewards properly", async function () {
        const { alice, bob, carol, dan, erin, theMaster, sushi, sushiMC, nurses } = await setupTest();
        const e18 = BigNumber.from(10).pow(18);

        class UserSushiInfo {
            pid: number;
            userInfo: UserInfo;

            constructor(pid: number, amount: BigNumberish, rewardDebt: BigNumberish) {
                this.pid = pid;
                this.userInfo = new UserInfo(amount, rewardDebt);
            }
        }

        class PoolSushiInfo {
            allocPoint: number;
            lastRewardBlock: number;
            accSushiPerShare: BigNumber;
            totalSupply: BigNumber;

            constructor(allocPoint: number, lastRewardBlock: number) {
                this.allocPoint = allocPoint;
                this.lastRewardBlock = lastRewardBlock;
                this.accSushiPerShare = Zero;
                this.totalSupply = Zero;
            }
            set(_allocPoint: number) {
                this.allocPoint = _allocPoint;
            }
            update(block: number, amount: BigNumberish, _accSushiPerShare: BigNumberish) {
                if (this.lastRewardBlock < block) {
                    this.lastRewardBlock = block;
                    this.accSushiPerShare = BigNumber.from(this.accSushiPerShare).add(_accSushiPerShare);
                }
                this.totalSupply = BigNumber.from(this.totalSupply).add(amount);
                if (this.totalSupply.lt(0)) throw "totalSupply < 0";
            }
        }

        const sushiPool = new PoolSushiInfo(10, 305);

        async function updateInfo(
            poolInfo: PoolSushiInfo,
            userInfo: UserInfo,
            sushiPid: number,
            amount: BigNumberish,
            rewardOn: boolean
        ) {
            const reward =
                rewardOn === true
                    ? tokenAmount(100)
                          .mul((await getBlock()) + 1 - poolInfo.lastRewardBlock)
                          .mul((await sushiMC.poolInfo(sushiPid))[1])
                          .div(await sushiMC.totalAllocPoint())
                    : Zero;
            assert.isFalse(reward.isNegative());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(e18).div(poolInfo.totalSupply) : 0;
            poolInfo.update((await getBlock()) + 1, amount, accInc);
            const newRewardDebt = userInfo.amount.add(amount).mul(poolInfo.accSushiPerShare).div(e18);
            userInfo.update(amount, newRewardDebt);
            return { poolInfo, userInfo };
        }

        async function checkUpdating(poolInfo: PoolSushiInfo, sushiPid: number) {
            expect(await theMaster.sushiLastRewardBlock()).to.be.equal(poolInfo.lastRewardBlock);
            expect((await sushiMC.poolInfo(sushiPid))[2]).to.be.equal(poolInfo.lastRewardBlock);

            //allow a difference within 0.001%
            const acc = poolInfo.accSushiPerShare.div(1000000); //unify precision
            expect((await sushiMC.poolInfo(sushiPid))[3]).to.be.lte(acc.mul(100001).div(100000));
            expect((await sushiMC.poolInfo(sushiPid))[3]).to.be.gte(acc.mul(99999).div(100000));
            expect(await theMaster.accSushiPerShare()).to.be.lte(poolInfo.accSushiPerShare.mul(100001).div(100000));
            expect(await theMaster.accSushiPerShare()).to.be.gte(poolInfo.accSushiPerShare.mul(99999).div(100000));

            expect((await sushiMC.userInfo(sushiPid, theMaster.address))[0]).to.be.equal(poolInfo.totalSupply);
            // console.log("total lp deposit", poolInfo.totalSupply.toString());
        }

        async function balanceInc(poolInfo: PoolSushiInfo, userInfo: UserInfo, sushiPid: number) {
            const reward = tokenAmount(100)
                .mul((await getBlock()) + 1 - poolInfo.lastRewardBlock)
                .mul((await sushiMC.poolInfo(sushiPid))[1])
                .div(await sushiMC.totalAllocPoint());
            const accInc = !poolInfo.totalSupply.isZero() ? reward.mul(e18).div(poolInfo.totalSupply) : 0;

            return userInfo.amount.mul(poolInfo.accSushiPerShare.add(accInc)).div(e18).sub(userInfo.rewardDebt);
        }

        async function checkSushiReward(user: SignerWithAddress, balanceInc: BigNumber) {
            const events = await sushi.queryFilter(
                sushi.filters.Transfer(theMaster.address, user.address, null),
                "latest"
            );
            const event = events[0];
            const transferedReward = event === undefined ? Zero : event.args[2];
            // console.log("transfered sushi", transferedReward.toString());
            //allow a difference within 0.001%
            expect(balanceInc).to.be.lte(transferedReward.mul(100001).div(100000));
            expect(balanceInc).to.be.gte(transferedReward.mul(99999).div(100000));
        }

        await nurses.addNurseType([5, 5, 5, 5], [1000, 2000, 3000, 4000], [5, 10, 15, 20], [100, 100, 100, 100]);
        await nurses.connect(alice).assemble(0, 10); //nurse0-alice
        await nurses.connect(dan).assemble(1, 10); //nurse1-dan
        await nurses.connect(erin).assemble(2, 10); //nurse2-erin
        await nurses.connect(erin).assemble(0, 10); //nurse3-erin
        await nurses.connect(erin).assemble(1, 10); //nurse4-erin

        const alice3Info = new UserSushiInfo(3, 0, 0);
        const bob3Info = new UserSushiInfo(3, 0, 0);
        const carol3Info = new UserSushiInfo(3, 0, 0);

        await updateInfo(sushiPool, alice3Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).support(3, 100, 0);

        await updateInfo(sushiPool, bob3Info.userInfo, 3, 900, false);
        await theMaster.connect(bob).support(3, 900, 1);

        await updateInfo(sushiPool, alice3Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).support(3, 100, 0);

        await updateInfo(sushiPool, bob3Info.userInfo, 3, -100, false);
        await theMaster.connect(bob).desupport(3, 100);

        expect(await sushi.balanceOf(alice.address)).to.be.equal(0);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);

        await updateInfo(sushiPool, bob3Info.userInfo, 3, -800, false);
        await theMaster.connect(bob).desupport(3, 800);

        await updateInfo(sushiPool, bob3Info.userInfo, 3, 700, false);
        await theMaster.connect(bob).support(3, 700, 2);

        await mineTo(START_BLOCK);
        await autoMining(false);
        await updateInfo(sushiPool, carol3Info.userInfo, 3, 1000, false);
        await theMaster.connect(carol).support(3, 1000, 0);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 100, false);
        await theMaster.connect(alice).support(3, 100, 0);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 900, false);
        await theMaster.connect(bob).support(3, 900, 2);
        await mine();
        await autoMining(true);
        //alice - n0(A)
        //bob - n2(E)
        //carol - n0(A)     but in sushi reward, supporting doesn't work.

        expect(await sushi.balanceOf(alice.address)).to.be.equal(0);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);

        await sushi.transferOwnership(sushiMC.address);

        await mineTo(305);

        sushiPool.update((await getBlock()) + 1, Zero, 0);
        await theMaster.setSushiMasterChef(sushiMC.address, 3);
        expect((await sushiMC.userInfo(3, theMaster.address))[0]).to.be.equal(sushiPool.totalSupply);

        // console.log(sushiPool);  2900
        // console.log(alice3Info.userInfo);  300
        // console.log(bob3Info.userInfo);    1600
        // console.log(carol3Info.userInfo);  1000

        let incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 100, true);
        await theMaster.connect(alice).support(3, 100, 0);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        await mineTo(500);
        let balA = await sushi.balanceOf(alice.address);
        let balB = await sushi.balanceOf(bob.address);
        let balC = await sushi.balanceOf(carol.address);

        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        let incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        let incC = await balanceInc(sushiPool, carol3Info.userInfo, 3);
        await autoMining(false);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, -200, true);
        await theMaster.connect(alice).desupport(3, 200);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, -100, true);
        await theMaster.connect(bob).desupport(3, 100);
        await updateInfo(sushiPool, carol3Info.userInfo, 3, 3000, true);
        await theMaster.connect(carol).support(3, 3000, 0);
        await mine();
        await autoMining(true);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);
        await checkSushiReward(bob, incB);
        await checkSushiReward(carol, incC);

        incC = await balanceInc(sushiPool, carol3Info.userInfo, 3);
        let amountC = carol3Info.userInfo.amount;
        await updateInfo(sushiPool, carol3Info.userInfo, 3, amountC.mul(-1), true);
        await expect(theMaster.connect(carol).emergencyDesupport(3))
            .to.emit(theMaster, "EmergencyDesupport")
            .withArgs(carol.address, 3, amountC);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, incC);

        // console.log((await sushi.balanceOf(alice.address)).toString());
        // console.log((await sushi.balanceOf(bob.address)).toString());
        // console.log((await sushi.balanceOf(carol.address)).toString());
        // console.log((await sushi.balanceOf(theMaster.address)).toString());

        // 5200
        await mineTo(START_BLOCK + 5190);

        let pendingIncA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).support(3, 0, 0); //support0 doesn't transfer sushi.

        let pendingIncB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).desupport(3, 0); //desupport0 doesn't transfer sushi.

        //5500
        await mine(10);
        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimAllReward(3);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA.add(pendingIncA));

        incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimAllReward(3);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB.add(pendingIncB));

        await mine(20);
        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 300, true);
        await theMaster.connect(alice).support(3, 300, 0);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, -500, true);
        await theMaster.connect(bob).desupport(3, 500);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        await updateInfo(sushiPool, carol3Info.userInfo, 3, 1500, true);
        await theMaster.connect(carol).support(3, 1500, 0);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, Zero);

        await mine(123);
        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimSushiReward(3);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimSushiReward(3);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        await mine(2);
        incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimAllReward(3);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(bob, incB);

        incC = await balanceInc(sushiPool, carol3Info.userInfo, 3);
        await updateInfo(sushiPool, carol3Info.userInfo, 3, 300, true);
        await theMaster.connect(carol).support(3, 300, carol.address);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(carol, incC);

        await mine(10);
        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        await updateInfo(sushiPool, alice3Info.userInfo, 3, -100, true);
        await theMaster.connect(alice).desupport(3, 100);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);

        await mine(50);
        await autoMining(false);
        incA = await balanceInc(sushiPool, alice3Info.userInfo, 3);
        incB = await balanceInc(sushiPool, bob3Info.userInfo, 3);
        incC = await balanceInc(sushiPool, carol3Info.userInfo, 3);

        await updateInfo(sushiPool, alice3Info.userInfo, 3, 0, true);
        await theMaster.connect(alice).claimSushiReward(3);
        await updateInfo(sushiPool, bob3Info.userInfo, 3, 0, true);
        await theMaster.connect(bob).claimSushiReward(3);
        await updateInfo(sushiPool, carol3Info.userInfo, 3, 0, true);
        await theMaster.connect(carol).claimAllReward(3);

        await mine();
        await autoMining(true);
        await checkUpdating(sushiPool, 3);
        await checkSushiReward(alice, incA);
        await checkSushiReward(bob, incB);
        await checkSushiReward(carol, incC);
    });

    it("should be pass testing overall functions with sushiMasterChef", async function () {
        const { alice, bob, carol, dan, erin, frank, coin, theMaster, sushi, sushiMC, nurses } = await setupTest();
        await nurses.addNurseType([5, 5, 5], [100, 200, 500], [10, 20, 50], [1000, 1000, 125]);
        await theMaster.set([1, 3], [60, 0]);

        await autoMining(false);

        await mineTo(100);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await theMaster.connect(bob).deposit(1, 200, bob.address);
        await mine();

        await mineTo(200);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await nurses.connect(alice).assemble(0, 5);
        await mine();

        await mineTo(250);
        await theMaster.connect(bob).withdraw(1, 100, bob.address);
        await theMaster.connect(carol).deposit(1, 100, carol.address);
        await nurses.connect(bob).assemble(0, 5);
        await theMaster.connect(alice).support(3, 100, 0);
        await mine();

        await mineTo(300);
        await theMaster.connect(dan).support(3, 400, 1);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(350);
        await theMaster.set([1, 3], [9, 51]);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await theMaster.connect(carol).deposit(1, 100, carol.address);
        await nurses.connect(alice).assemble(0, 5);
        await nurses.connect(bob).assemble(1, 5);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(400);
        await theMaster.connect(alice).deposit(1, 0, alice.address);
        await theMaster.connect(bob).withdraw(1, 0, bob.address);
        await theMaster.connect(erin).support(3, 200, 3);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(450);
        await nurses.connect(alice).claim([0, 2]);
        await nurses.connect(frank).assemble(2, 5);
        await theMaster.connect(alice).support(3, 100, 0);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(500);
        await sushi.transferOwnership(sushiMC.address);
        await theMaster.setSushiMasterChef(sushiMC.address, 3);
        await theMaster.connect(dan).desupport(3, 400);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(550);
        await theMaster.connect(alice).deposit(1, 0, alice.address);
        await nurses.connect(bob).claim([1]);
        await theMaster.connect(dan).support(3, 1000, 4);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(600);
        await theMaster.connect(alice).claimAllReward(1);
        await theMaster.connect(carol).claimSushiReward(1);
        await nurses.connect(alice).claim([0,2]);
        await nurses.connect(bob).claim([3]);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(650);
        await nurses.connect(bob).claim([1,3]);
        await theMaster.connect(alice).support(3, 0, 0);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }

        await mineTo(700);
        await theMaster.connect(alice).deposit(1, 100, alice.address);
        await theMaster.connect(bob).claimAllReward(1);
        await theMaster.connect(carol).deposit(1, 100, carol.address);
        await nurses.connect(frank).claim([4]);
        await theMaster.connect(alice).claimAllReward(3);
        await theMaster.connect(dan).claimAllReward(3);
        // await theMaster.connect(erin).desupport(3, 0);
        await mine();

        // {
        //     console.log(await getBlock(), "th block mined");

        //     console.log("MaidCoin Balance");
        //     console.log("alice : ", (await coin.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await coin.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await coin.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await coin.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await coin.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await coin.balanceOf(frank.address)).toString());
            
        //     console.log("Sushi Balance");
        //     console.log("alice : ", (await sushi.balanceOf(alice.address)).toString());
        //     console.log("bob : ", (await sushi.balanceOf(bob.address)).toString());
        //     console.log("carol : ", (await sushi.balanceOf(carol.address)).toString());
        //     console.log("dan : ", (await sushi.balanceOf(dan.address)).toString());
        //     console.log("erin : ", (await sushi.balanceOf(erin.address)).toString());
        //     console.log("frank : ", (await sushi.balanceOf(frank.address)).toString());
        // }
    });

    it("should be that deposit/withdraw functions works well with mastercoin, pid0", async function () {
        const { alice, bob, carol, dan, coin, master, theMaster } = await setupTest();
        
        await master.transfer(alice.address, tokenAmount(25));
        await master.transfer(bob.address, tokenAmount(25));
        await master.transfer(carol.address, tokenAmount(25));
        await master.transfer(dan.address, tokenAmount(25));

        await master.connect(alice).approve(theMaster.address, MaxUint256);
        await master.connect(bob).approve(theMaster.address, MaxUint256);
        await master.connect(carol).approve(theMaster.address, MaxUint256);
        await master.connect(dan).approve(theMaster.address, MaxUint256);

        await mineTo(250);
        await theMaster.connect(alice).deposit(0, tokenAmount(25), alice.address);
        await theMaster.connect(bob).deposit(0, tokenAmount(25), bob.address);
        await theMaster.connect(carol).deposit(0, tokenAmount(25), carol.address);

        await mineTo(350);
        await autoMining(false);
        await theMaster.connect(alice).deposit(0, 0, alice.address);
        await theMaster.connect(bob).withdraw(0, 0, bob.address);
        await theMaster.connect(carol).deposit(0, 0, carol.address);
        const rb50 = tokenAmount(1).div(10).mul(50);
        const r0 = rb50.div(3);
        await expect(() => mine()).to.changeTokenBalances(coin, [alice,bob,carol,dan], [r0,r0,r0,0]);

        await mineTo(400);
        await theMaster.connect(alice).withdraw(0, 0, alice.address);
        await theMaster.connect(bob).deposit(0, 0, bob.address);
        await theMaster.connect(carol).withdraw(0, tokenAmount(25), carol.address);
        const r1 = rb50.div(3).add(1);  //smath
        await expect(() => mine()).to.changeTokenBalances(coin, [alice,bob,carol,dan], [r1,r1,r1,0]);

        await mineTo(450);
        await theMaster.connect(alice).withdraw(0, 0, alice.address);
        await theMaster.connect(bob).deposit(0, 0, bob.address);
        const r2 = rb50.div(2);
        await expect(() => mine()).to.changeTokenBalances(coin, [alice,bob,carol,dan], [r2,r2,0,0]);

        await autoMining(true);
        await theMaster.connect(alice).withdraw(0, tokenAmount(25), alice.address);
        await theMaster.connect(bob).withdraw(0, tokenAmount(25), bob.address);

        expect((await theMaster.poolInfo(0))[7]).to.be.equal(0);
    });
});
