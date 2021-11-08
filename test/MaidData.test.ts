import { NFT721V2,MaidData } from "../typechain";

const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = ethers;
const { mine } = require("./shared/utils/blockchain");

const tokenAmount = (value: number) => {
    return ethers.utils.parseEther(String(value));
};

/**
    await network.provider.send("evm_setAutomine", [true]);
    await network.provider.send("evm_setAutomine", [false]);
 */

const INITIAL_REWARD_PER_BLOCK = tokenAmount(100);

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan] = signers;

    const TestLPToken = await ethers.getContractFactory("TestLPToken");
    const lpToken = await TestLPToken.deploy();
    await mine();
    await lpToken.mint(alice.address, tokenAmount(1000));
    await lpToken.mint(bob.address, tokenAmount(1000));
    await lpToken.mint(carol.address, tokenAmount(1000));
    await lpToken.mint(dan.address, tokenAmount(1000));

    const TestSushiToken = await ethers.getContractFactory("TestSushiToken");
    const sushi = await TestSushiToken.deploy();
    await mine();

    const TestMasterChef = await ethers.getContractFactory("TestMasterChef");
    const mc = await TestMasterChef.deploy(sushi.address, deployer.address, INITIAL_REWARD_PER_BLOCK, 0, 0);
    await mine();

    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await mine();

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const coin = await MaidCoin.deploy();
    await mine();

    const MaidCafe = await ethers.getContractFactory("MaidCafe");
    const cafe = await MaidCafe.deploy(coin.address, weth.address);
    await mine();

    const Maids = await ethers.getContractFactory("NFT721V2");
    const maids = await Maids.deploy() as NFT721V2;
    await maids["initialize(address,string,string,uint256[],address,uint8)"](deployer.address, "MAID", "MAID", [0,1,2], cafe.address, 0);
    await mine();

    const MaidData = await ethers.getContractFactory("MaidData");
    const maidData = await MaidData.deploy(lpToken.address, sushi.address, maids.address) as MaidData;
    await maidData.setPowers([0,1,2],[1,2,3]);
    await mine();

    await maids.setTarget(maidData.address);
    const maidWithData = await MaidData.attach(maids.address) as MaidData;
    await mine();

    await maids.transferFrom(deployer.address, alice.address, 0);
    await maids.transferFrom(deployer.address, bob.address, 1);
    await maids.transferFrom(deployer.address, carol.address, 2);
    await mine();

    await lpToken.connect(alice).approve(mc.address, ethers.constants.MaxUint256);
    await lpToken.connect(bob).approve(mc.address, ethers.constants.MaxUint256);
    await lpToken.connect(carol).approve(mc.address, ethers.constants.MaxUint256);
    await lpToken.connect(dan).approve(mc.address, ethers.constants.MaxUint256);

    await lpToken.connect(alice).approve(maidData.address, ethers.constants.MaxUint256);
    await lpToken.connect(bob).approve(maidData.address, ethers.constants.MaxUint256);
    await lpToken.connect(carol).approve(maidData.address, ethers.constants.MaxUint256);
    await lpToken.connect(dan).approve(maidData.address, ethers.constants.MaxUint256);

    await sushi.transferOwnership(mc.address);

    await mc.add(0, sushi.address, true);
    await mc.add(1, sushi.address, true);
    await mc.add(1, lpToken.address, true);
    await mine();

    return {
        deployer,
        alice,
        bob,
        carol,
        dan,
        lpToken,
        sushi,
        mc,
        maids,
        maidData,
        maidWithData
    };
};

describe("Maids interact with MasterChef", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("overall test", async function () {
        const { alice, bob, carol, dan, lpToken, sushi, mc, maids, maidData, maidWithData } = await setupTest();
        await network.provider.send("evm_setAutomine", [true]);

        await maidData.connect(alice).support(0, 100);
        await maidData.connect(bob).support(1, 200);

        await mine();
        await mine();

        await maidData.connect(bob).desupport(1, 100);
        await mine();

        await maidData.connect(alice).support(0, 100); //200
        await maidData.connect(bob).support(1, 200); //300

        expect(await lpToken.balanceOf(maidData.address)).to.be.equal(500);

        await expect(maidData.setSushiMasterChef(mc.address, 0)).to.be.reverted;
        await expect(maidData.setSushiMasterChef(mc.address, 1)).to.be.reverted;

        await network.provider.send("evm_setAutomine", [false]);

        await maidData.setSushiMasterChef(mc.address, 2);
        await maidData.connect(carol).support(2, 500);
        await mine(); //ex) 10b

        await network.provider.send("evm_setAutomine", [true]);
        expect((await maidWithData.maidInfo(2)).supportedLPTokenAmount).to.be.equal(500);
        expect((await mc.userInfo(2, maidData.address)).amount).to.be.equal(1000);

        await mine(9); //ex) 19b mined
        await maidData.connect(alice).support(0, 1000); //20b_totalReward tokenAmount(500)

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(100));
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(400));

        await maidData.connect(bob).claimSushiReward(1); //21b_totalReward tokenAmount(550)

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(100));
        const t75 = ethers.BigNumber.from(10).pow(17).mul(75);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(150).add(t75));
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(550).sub(tokenAmount(250).add(t75)));
        await expect(maidData.connect(alice).desupport(0, 5000)).to.be.reverted;
        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(alice).desupport(0, 1000); //23b_totalReward tokenAmount(650)
        await maidData.connect(carol).support(2, 1000); //23b_totalReward tokenAmount(650)
        await mine(); //23b

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(190));
        const t125 = ethers.BigNumber.from(10).pow(17).mul(125);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(150).add(t75));
        expect(await sushi.balanceOf(carol.address)).to.be.equal(tokenAmount(250).add(t125).add(tokenAmount(25)));
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(15));

        await maidData.connect(bob).desupport(1, 300); //24b_totalReward tokenAmount(700)
        await mine(); //24b
        await network.provider.send("evm_setAutomine", [true]);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(180));

        // await maidData.connect(bob).claimSushiReward(1);
        await expect(maidData.connect(bob).claimSushiReward(1)).to.be.reverted;

        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(alice).desupport(0, 200); //26b_totalReward tokenAmount(800)
        await maidData.connect(bob).support(1, 100); //26b_totalReward tokenAmount(800)
        await maidData.connect(carol).support(2, 100); //26b_totalReward tokenAmount(800)
        await mine(); //26b

        await network.provider.send("evm_setAutomine", [true]);
        expect(await sushi.balanceOf(alice.address)).to.be.gt(tokenAmount(206));
        expect(await sushi.balanceOf(alice.address)).to.be.lt(tokenAmount(207));
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(180));
        expect(await sushi.balanceOf(carol.address)).to.be.gt(tokenAmount(413));
        expect(await sushi.balanceOf(carol.address)).to.be.lt(tokenAmount(414));
        expect(await sushi.balanceOf(maidData.address)).to.be.lte(1);

        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(bob).support(1, 200);
        await maidData.connect(carol).support(2, 100);
        await mine();
        await network.provider.send("evm_setAutomine", [true]);
        await maidData.connect(alice).support(0, 1200);

        await network.provider.send("evm_setAutomine", [false]);
        await mc.set(2, 0, true);
        await mine();

        const r1 = await maidWithData.pendingSushiReward(0);
        const r2 = await maidWithData.pendingSushiReward(1);
        const r3 = await maidWithData.pendingSushiReward(2);

        await network.provider.send("evm_setAutomine", [true]);

        await expect(() => maidData.connect(alice).claimSushiReward(0)).to.changeTokenBalance(sushi, alice, r1);
        await expect(() => maidData.connect(bob).claimSushiReward(1)).to.changeTokenBalance(sushi, bob, r2);
        await expect(() => maidData.connect(carol).claimSushiReward(2)).to.changeTokenBalance(sushi, carol, r3);
    });

    it("overall test2", async function () {
        const { alice, bob, carol, dan, lpToken, sushi, mc, maids, maidData, maidWithData } = await setupTest();
        await network.provider.send("evm_setAutomine", [true]);

        await expect(maidData.connect(alice).support(1, 100)).to.be.revertedWith("Maids: Forbidden");
        await expect(maidData.connect(bob).support(0, 100)).to.be.revertedWith("Maids: Forbidden");
        await maidData.connect(alice).support(0, 100);
        await maidData.connect(bob).support(1, 200);

        await mine();
        await mine();

        await maidData.connect(bob).desupport(1, 100);
        await mine();

        await maidData.connect(alice).support(0, 100); //200
        await maidData.connect(bob).support(1, 200); //300

        expect(await lpToken.balanceOf(maidData.address)).to.be.equal(500);

        await network.provider.send("evm_setAutomine", [false]);

        await maidData.setSushiMasterChef(mc.address, 2);
        await maidData.connect(carol).support(2, 500);
        await mine(); //ex) 10b

        await network.provider.send("evm_setAutomine", [true]);
        expect((await maidWithData.maidInfo(2)).supportedLPTokenAmount).to.be.equal(500);
        expect((await mc.userInfo(2, maidData.address)).amount).to.be.equal(1000);

        await mine(9); //ex) 19b mined
        await maidData.connect(alice).support(0, 1000); //20b_totalReward tokenAmount(500)

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(100));
        expect(await sushi.balanceOf(bob.address)).to.be.equal(0);
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(400));

        await maidData.connect(bob).claimSushiReward(1); //21b_totalReward tokenAmount(550)

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(100));
        const t75 = ethers.BigNumber.from(10).pow(17).mul(75);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(150).add(t75));
        expect(await sushi.balanceOf(carol.address)).to.be.equal(0);
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(550).sub(tokenAmount(250).add(t75)));
        await expect(maidData.connect(alice).desupport(0, 5000)).to.be.reverted;
        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(alice).desupport(0, 1000); //23b_totalReward tokenAmount(650)
        await maidData.connect(carol).support(2, 1000); //23b_totalReward tokenAmount(650)
        await mine(); //23b

        expect(await sushi.balanceOf(alice.address)).to.be.equal(tokenAmount(190));
        const t125 = ethers.BigNumber.from(10).pow(17).mul(125);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(150).add(t75));
        expect(await sushi.balanceOf(carol.address)).to.be.equal(tokenAmount(250).add(t125).add(tokenAmount(25)));
        expect(await sushi.balanceOf(maidData.address)).to.be.equal(tokenAmount(15));

        await maidData.connect(bob).desupport(1, 300); //24b_totalReward tokenAmount(700)
        await mine(); //24b
        await network.provider.send("evm_setAutomine", [true]);
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(180));

        // await maidData.connect(bob).claimSushiReward(1);
        await expect(maidData.connect(bob).claimSushiReward(1)).to.be.reverted;

        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(alice).desupport(0, 200); //26b_totalReward tokenAmount(800)
        await maidData.connect(bob).support(1, 100); //26b_totalReward tokenAmount(800)
        await maidData.connect(carol).support(2, 100); //26b_totalReward tokenAmount(800)
        await mine(); //26b

        await network.provider.send("evm_setAutomine", [true]);
        expect(await sushi.balanceOf(alice.address)).to.be.gt(tokenAmount(206));
        expect(await sushi.balanceOf(alice.address)).to.be.lt(tokenAmount(207));
        expect(await sushi.balanceOf(bob.address)).to.be.equal(tokenAmount(180));
        expect(await sushi.balanceOf(carol.address)).to.be.gt(tokenAmount(413));
        expect(await sushi.balanceOf(carol.address)).to.be.lt(tokenAmount(414));
        expect(await sushi.balanceOf(maidData.address)).to.be.lte(1);

        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(bob).support(1, 200);
        await maidData.connect(carol).support(2, 100);
        await mine();
        await network.provider.send("evm_setAutomine", [true]);
        await maidData.connect(alice).support(0, 1200);

        await network.provider.send("evm_setAutomine", [false]);
        // console.log((await maidWithData.maidInfo(0)).supportedLPTokenAmount.toString());
        // console.log((await maidWithData.maidInfo(1)).supportedLPTokenAmount.toString());
        // console.log((await maidWithData.maidInfo(2)).supportedLPTokenAmount.toString());
        await maidData.connect(alice).desupport(0, 1000); // maid_0 : 200
        await maidData.connect(bob).claimSushiReward(1); // maid_1 : 300
        await maidData.connect(carol).desupport(2, 1200); //maid_2 : 500
        await mine(2);

        await mc.set(2, 0, true);
        await mc.add(9, lpToken.address, true);
        await mine();

        const r1 = await maidWithData.pendingSushiReward(0);
        const r2 = await maidWithData.pendingSushiReward(1);
        const r3 = await maidWithData.pendingSushiReward(2);

        expect(r1).to.be.equal(tokenAmount(20));
        expect(r2).to.be.equal(tokenAmount(30));
        expect(r3).to.be.equal(tokenAmount(50));

        await network.provider.send("evm_setAutomine", [true]);
        await expect(() => maidData.connect(alice).claimSushiReward(0)).to.changeTokenBalance(sushi, alice, r1);
        await expect(() => maidData.connect(bob).claimSushiReward(1)).to.changeTokenBalance(sushi, bob, r2);

        await mine(5);

        expect(await maidWithData.pendingSushiReward(0)).to.be.equal(0);
        expect(await maidWithData.pendingSushiReward(1)).to.be.equal(0);

        await expect(maidData.connect(alice).claimSushiReward(0)).to.be.revertedWith(
            "MasterChefModule: Nothing can be claimed"
        );
        await expect(maidData.connect(bob).claimSushiReward(1)).to.be.revertedWith(
            "MasterChefModule: Nothing can be claimed"
        );

        expect((await mc.userInfo(2, maidData.address)).amount).to.be.equal(1000);
        expect((await mc.userInfo(3, maidData.address)).amount).to.be.equal(0);

        await maidData.setSushiMasterChef(mc.address, 3);

        expect((await mc.userInfo(2, maidData.address)).amount).to.be.equal(0);
        expect((await mc.userInfo(3, maidData.address)).amount).to.be.equal(1000);

        await mine();
        await mc.set(3, 0, true);
        await network.provider.send("evm_setAutomine", [false]);
        expect((await maidWithData.maidInfo(0)).supportedLPTokenAmount).to.be.equal(200);
        expect((await maidWithData.maidInfo(1)).supportedLPTokenAmount).to.be.equal(300);
        expect((await maidWithData.maidInfo(2)).supportedLPTokenAmount).to.be.equal(500);

        const r4 = await maidWithData.pendingSushiReward(0);
        const r5 = await maidWithData.pendingSushiReward(1);
        const r6 = await maidWithData.pendingSushiReward(2);

        expect(r4).to.be.equal(tokenAmount(36));
        expect(r5).to.be.equal(tokenAmount(54));
        expect(r6).to.be.equal(tokenAmount(90).add(tokenAmount(50))); //+50 from 288 line

        await network.provider.send("evm_setAutomine", [true]);
        await expect(() => maidData.connect(alice).claimSushiReward(0)).to.changeTokenBalance(sushi, alice, r4);
        await expect(() => maidData.connect(bob).claimSushiReward(1)).to.changeTokenBalance(sushi, bob, r5);
        await expect(() => maidData.connect(carol).claimSushiReward(2)).to.changeTokenBalance(sushi, carol, r6);

        //additional
        await mc.set(3, 100, true);
        const b0 = await sushi.balanceOf(alice.address);
        await network.provider.send("evm_setAutomine", [false]);
        await maidData.connect(alice).desupport(0, 1);
        await maidData.connect(alice).claimSushiReward(0);
        await maidData.connect(alice).support(0, 2);
        await mine();
        expect((await maidWithData.maidInfo(0)).supportedLPTokenAmount).to.be.equal(201);
        const diff0 = INITIAL_REWARD_PER_BLOCK.mul(100).div(101).mul(2).div(10);
        expect(await sushi.balanceOf(alice.address)).to.be.equal(b0.add(diff0));

        await lpToken.connect(dan).approve(mc.address, ethers.constants.MaxUint256);
        await mine();
        await network.provider.send("evm_setAutomine", [true]);
        await mc.connect(dan).deposit(3, (await mc.userInfo(3, maidData.address)).amount);
        expect((await mc.userInfo(3, maidData.address)).amount).to.be.equal((await mc.userInfo(3, dan.address)).amount);
        let sushiPerBlock = INITIAL_REWARD_PER_BLOCK.mul(100).div(101);
        const diff1 = sushiPerBlock.mul(2).mul(201).div(1001).add(sushiPerBlock.mul(201).div(2002));
        await expect(() => maidData.connect(alice).claimSushiReward(0)).to.changeTokenBalance(sushi, alice, diff1.add(1)); //due to solidity math

        await network.provider.send("evm_setAutomine", [false]);
        await mc.connect(dan).deposit(3, (await mc.userInfo(3, maidData.address)).amount);
        await maidData.connect(alice).claimSushiReward(0);
        await expect(() => mine()).to.changeTokenBalance(sushi, alice, sushiPerBlock.mul(201).div(2002));
        await mine();

        await network.provider.send("evm_setAutomine", [true]);
        
        await expect(maidData.connect(bob).support(0, 1)).to.be.revertedWith("Maids: Forbidden");
        await expect(maidData.connect(bob).claimSushiReward(0)).to.be.revertedWith("Maids: Forbidden");

        await maids.connect(alice).transferFrom(alice.address, bob.address, 0);
        await expect(maidData.connect(alice).support(0, 1)).to.be.revertedWith("Maids: Forbidden");
        await expect(maidData.connect(alice).claimSushiReward(0)).to.be.revertedWith("Maids: Forbidden");

        await maidData.connect(bob).support(0, 1);
        await maidData.connect(bob).claimSushiReward(0);
    });
});
