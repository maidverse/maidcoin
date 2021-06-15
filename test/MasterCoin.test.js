const { ethers } = require("hardhat");
const { expect } = require("chai");
const { mine } = require("./helpers/evm");
const { tokenAmount } = require("./helpers/ethers");

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol, dan] = signers;

    const MaidCoin = await ethers.getContractFactory("MaidCoin");
    const maidCoin = await MaidCoin.deploy();

    const MasterCoin = await ethers.getContractFactory("MasterCoin");
    const token = await MasterCoin.deploy(maidCoin.address);

    await mine();

    const totalSupply = await token.TOTAL_SUPPLY();
    await token.transfer(alice.address, totalSupply.div(10));
    await token.transfer(bob.address, totalSupply.div(10).mul(2));
    await token.transfer(carol.address, totalSupply.div(10).mul(3));
    await token.transfer(dan.address, totalSupply.div(10).mul(4));

    await mine();

    return {
        deployer,
        alice,
        bob,
        carol,
        dan,
        maidCoin,
        token,
    };
};

describe("MasterCoin", function () {
    beforeEach(async function () {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("should be that initial values of variations are right", async function () {
        const { alice, bob, carol, dan, maidCoin, token } = await setupTest();
        
        const totalSupply = await token.TOTAL_SUPPLY();

        const tokenBalOfAlice = await token.balanceOf(alice.address);
        const tokenBalOfBob = await token.balanceOf(bob.address);
        const tokenBalOfCarol = await token.balanceOf(carol.address);
        const tokenBalOfDan = await token.balanceOf(dan.address);
        expect(tokenBalOfAlice.add(tokenBalOfBob).add(tokenBalOfCarol).add(tokenBalOfDan)).to.be.equal(totalSupply);

        expect(await maidCoin.balanceOf(token.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(0);

        expect(await token.isInitialSupplyBurned()).to.be.false;
        expect(await token.lastBalance()).to.be.equal(0);
        expect(await token.MAIDCOIN_INITIAL_SUPPLY()).to.be.equal(tokenAmount(30000));
    });

    it("should be that no one can claim own's reward before accumulated reward reachs MaidCoin initial supply", async function () {
        const { alice, bob, maidCoin, token } = await setupTest();

        const initialSupply = await token.MAIDCOIN_INITIAL_SUPPLY();

        expect(await maidCoin.balanceOf(token.address)).to.be.equal(0);
        await maidCoin.mint(token.address, tokenAmount(13000));
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.lt(initialSupply);
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(13000));
        
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        await token.claim(alice.address);
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        await token.claim(bob.address);
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        
        await maidCoin.mint(token.address, tokenAmount(16000));
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.lt(initialSupply);
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(29000));

        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        await token.claim(alice.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        

        await maidCoin.mint(token.address, tokenAmount(2000));
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.gt(initialSupply);
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(31000));
        
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        await token.claim(alice.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(100));
        
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        await token.claim(bob.address);
        await mine();
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(200));
    });

    it("should be fail that burnInitialSupply function is called before accumulated reward reachs MaidCoin initial supply", async function () {
        const { maidCoin, token } = await setupTest();

        const initialSupply = await token.MAIDCOIN_INITIAL_SUPPLY();

        await maidCoin.mint(token.address, tokenAmount(15000));
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.lt(initialSupply);
        
        await network.provider.send("evm_setAutomine", [true]);
        await expect(token.burnInitialSupply()).to.be.revertedWith("MasterCoin : not yet");
        
        await maidCoin.mint(token.address, tokenAmount(20000));
        expect(await maidCoin.balanceOf(token.address)).to.be.gt(initialSupply);
        
        await token.burnInitialSupply();
        await network.provider.send("evm_setAutomine", [false]);
    });

    it("should be fail calling burnInitialSupply function if that function is already called", async function () {
        const { maidCoin, token } = await setupTest();

        const initialSupply = await token.MAIDCOIN_INITIAL_SUPPLY();

        await maidCoin.mint(token.address, tokenAmount(35000));
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.gt(initialSupply);

        await token.burnInitialSupply();
        await mine();

        await network.provider.send("evm_setAutomine", [true]);
        await expect(token.burnInitialSupply()).to.be.revertedWith("MasterCoin : already burned");
        await network.provider.send("evm_setAutomine", [false]);
    });

    it("should burn initial supply of MaidCoin", async function () {
        const { maidCoin, token } = await setupTest();

        expect(await token.isInitialSupplyBurned()).to.be.false;

        await maidCoin.mint(token.address, tokenAmount(20000));
        await mine();
        
        await maidCoin.mint(token.address, tokenAmount(27000));
        await mine();

        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(47000));
        expect(await token.isInitialSupplyBurned()).to.be.false;
        
        await token.burnInitialSupply();
        await mine();
        
        expect(await token.isInitialSupplyBurned()).to.be.true;
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(17000));
    });

    it("should give users' reward well through claim function", async function () {
        const { alice, bob, carol, dan, maidCoin, token } = await setupTest();

        await maidCoin.mint(token.address, tokenAmount(40000));
        await mine();
        
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        await token.claim(alice.address);
        await token.claim(bob.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(2000));
        
        await maidCoin.mint(token.address, tokenAmount(10000));
        await mine();

        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(0);
        await token.claim(alice.address);
        await token.claim(bob.address);
        await token.claim(carol.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(2000));
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(4000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(6000));

        await maidCoin.mint(token.address, tokenAmount(10000));
        await mine();

        await token.claim(dan.address);
        await mine();
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(tokenAmount(12000));

        const eventFilter = token.filters.Claim();
        let event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(dan.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(12000));

        await token.claim(alice.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(3000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(alice.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(1000));

        await token.claim(bob.address);
        await mine();
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(6000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(bob.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(2000));
    });

    it("should calculate users' reward exactly through claimableAmount function", async function () {
        const { alice, bob, carol, dan, maidCoin, token } = await setupTest();

        expect(await token.claimableAmount(alice.address)).to.be.equal(0);
        expect(await token.claimableAmount(bob.address)).to.be.equal(0);
        expect(await token.claimableAmount(carol.address)).to.be.equal(0);
        expect(await token.claimableAmount(dan.address)).to.be.equal(0);

        await maidCoin.mint(token.address, tokenAmount(40000));
        await mine();
        
        expect(await token.claimableAmount(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await token.claimableAmount(bob.address)).to.be.equal(tokenAmount(2000));

        await token.claim(alice.address);
        await token.claim(bob.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(2000));
        
        await maidCoin.mint(token.address, tokenAmount(10000));
        await mine();

        expect(await token.claimableAmount(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await token.claimableAmount(bob.address)).to.be.equal(tokenAmount(2000));
        expect(await token.claimableAmount(carol.address)).to.be.equal(tokenAmount(6000));

        await token.claim(alice.address);
        await token.claim(bob.address);
        await token.claim(carol.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(2000));
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(4000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(6000));
        
        await maidCoin.mint(token.address, tokenAmount(10000));
        await mine();
        
        expect(await token.claimableAmount(dan.address)).to.be.equal(tokenAmount(12000));
        await token.claim(dan.address);
        await mine();
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(tokenAmount(12000));

        expect(await token.claimableAmount(dan.address)).to.be.equal(0);
        await mine();
        expect(await token.claimableAmount(dan.address)).to.be.equal(0);

    });

    it("should give users' reward well when transfer / transferFrom function is called", async function () {
        const { deployer, alice, bob, carol, dan, maidCoin, token } = await setupTest();

        await maidCoin.mint(token.address, tokenAmount(40000));
        await mine();

        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(0);

        await token.connect(bob).transfer(carol.address, tokenAmount(10));  //10%20%30%40% -> 10%10%40%40%
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(0);
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(2000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(3000));
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(0);

        const eventFilter = token.filters.Claim();
        let event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(bob.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(2000));
        expect(event[1].args[0]).to.be.equal(carol.address);
        expect(event[1].args[1]).to.be.equal(tokenAmount(3000));

        await token.claim(bob.address);
        await token.claim(carol.address);
        await mine();
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(2000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(3000));
        
        await token.claim(alice.address);
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(1000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(alice.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(1000));

        await token.connect(alice).transfer(dan.address, tokenAmount(10));  //10%20%30%40% -> 0%10%40%50%
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(tokenAmount(4000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(dan.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(4000));

        await maidCoin.mint(token.address, tokenAmount(10000));
        await mine();
        
        await token.connect(carol).transfer(alice.address, tokenAmount(20));  //0%10%40%50% -> 20%10%20%50%
        await mine();
        expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(1000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(7000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(carol.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(4000));

        await token.connect(carol).approve(deployer.address, tokenAmount(1000000));
        await token.transferFrom(carol.address, bob.address, tokenAmount(10));  //20%10%20%50% -> 20%20%10%50%
        await mine();
        expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(3000));
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(7000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(bob.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(1000));

        await token.transferFrom(carol.address, dan.address, tokenAmount(5));  //20%20%10%50% -> 20%20%5%55%
        await mine();
        expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(7000));
        expect(await maidCoin.balanceOf(dan.address)).to.be.equal(tokenAmount(9000));

        event = await token.queryFilter(eventFilter, "latest");
        expect(event[0].args[0]).to.be.equal(dan.address);
        expect(event[0].args[1]).to.be.equal(tokenAmount(5000));
    });

    it("should works well in complex", async function () {
        const { deployer, alice, bob, carol, dan, maidCoin, token } = await setupTest();

        async function mintAndMining(m) {
            await maidCoin.mint(token.address, tokenAmount(m));
            await mine();
        }

        async function transferToken(user1, user2, amount) {
            await token.connect(user1).transfer(user2.address, tokenAmount(amount))
        }

        async function checkTokenBalance(a, b, c, d) {
            expect(await token.balanceOf(alice.address)).to.be.equal(tokenAmount(a));
            expect(await token.balanceOf(bob.address)).to.be.equal(tokenAmount(b));
            expect(await token.balanceOf(carol.address)).to.be.equal(tokenAmount(c));
            expect(await token.balanceOf(dan.address)).to.be.equal(tokenAmount(d));
        }

        async function checkMaidCoinBalance(a, b, c, d) {
            expect(await maidCoin.balanceOf(alice.address)).to.be.equal(tokenAmount(a));
            expect(await maidCoin.balanceOf(bob.address)).to.be.equal(tokenAmount(b));
            expect(await maidCoin.balanceOf(carol.address)).to.be.equal(tokenAmount(c));
            expect(await maidCoin.balanceOf(dan.address)).to.be.equal(tokenAmount(d));
        }

        async function checkClaimableAmount(a, b, c, d) {
            expect(await token.claimableAmount(alice.address)).to.be.equal(tokenAmount(a));
            expect(await token.claimableAmount(bob.address)).to.be.equal(tokenAmount(b));
            expect(await token.claimableAmount(carol.address)).to.be.equal(tokenAmount(c));
            expect(await token.claimableAmount(dan.address)).to.be.equal(tokenAmount(d));
        }

        await mintAndMining(100);
        await mintAndMining(200);
        await token.claim(carol.address);
        await mine();
        await mintAndMining(1000);
        await maidCoin.mint(token.address, tokenAmount(2000));
        await maidCoin.mint(token.address, tokenAmount(4800));
        await mine();
        await mintAndMining(2100);
        await token.claim(dan.address);
        await mine();
        await checkTokenBalance(10,20,30,40);
        await checkMaidCoinBalance(0,0,0,0);
        await checkClaimableAmount(0,0,0,0);
        
        await mintAndMining(18000);
        await transferToken(dan, alice, 10);
        await token.connect(bob).approve(deployer.address, tokenAmount(100000));
        await token.transferFrom(bob.address, carol.address, tokenAmount(10));
        await mine();
        await checkTokenBalance(20,10,40,30);
        await mintAndMining(1800);

        await checkClaimableAmount(0,0,0,0);
        
        await mintAndMining(5000);
        await checkMaidCoinBalance(0,0,0,0);
        await checkClaimableAmount(1000,500,2000,1500);
        
        await token.claim(bob.address);
        await token.claim(dan.address);
        await mine();
        await checkMaidCoinBalance(0,500,0,1500);
        await checkClaimableAmount(1000,0,2000,0);
        
        await mintAndMining(2000);
        await checkMaidCoinBalance(0,500,0,1500);
        await checkClaimableAmount(1400,200,2800,600);
        
        await token.claim(carol.address);
        await mine();
        await checkMaidCoinBalance(0,500,2800,1500);
        await checkClaimableAmount(1400,200,0,600);
        
        await token.claim(alice.address);
        await mine();
        await checkMaidCoinBalance(1400,500,2800,1500);
        await checkClaimableAmount(0,200,0,600);
        
        await mintAndMining(7000);
        await checkMaidCoinBalance(1400,500,2800,1500);
        await checkClaimableAmount(1400,900,2800,2700);
        
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(37800));
        expect(await token.lastBalance()).to.be.equal(tokenAmount(30800));
        expect(await token.isInitialSupplyBurned()).to.be.false;
        await token.burnInitialSupply();
        await mine();
        expect(await maidCoin.balanceOf(token.address)).to.be.equal(tokenAmount(7800));
        expect(await token.lastBalance()).to.be.equal(tokenAmount(7800));
        expect(await token.isInitialSupplyBurned()).to.be.true;
        
        await checkTokenBalance(20,10,40,30);
        await maidCoin.mint(token.address, tokenAmount(2000));
        await transferToken(alice, bob, 20);
        await mine();
        await checkTokenBalance(0,30,40,30);
        await checkMaidCoinBalance(3200,1600,2800,1500);
        await checkClaimableAmount(0,0,3600,3300);

        await mintAndMining(1000);
        await checkMaidCoinBalance(3200,1600,2800,1500);
        await checkClaimableAmount(0,300,4000,3600);

        await token.claim(bob.address);
        await mine();
        await checkMaidCoinBalance(3200,1900,2800,1500);
        await checkClaimableAmount(0,0,4000,3600);
        
        await checkTokenBalance(0,30,40,30);
        await transferToken(dan, bob, 30);
        await transferToken(bob, carol, 10);
        await mine();
        await checkTokenBalance(0,50,50,0);
        await checkMaidCoinBalance(3200,1900,6800,5100);
        await checkClaimableAmount(0,0,0,0);

        await mintAndMining(10000);
        await checkMaidCoinBalance(3200,1900,6800,5100);
        await checkClaimableAmount(0,5000,5000,0);

        await checkTokenBalance(0,50,50,0);
        await transferToken(bob, alice, 50);
        await maidCoin.mint(token.address, tokenAmount(100));
        await mine();
        await checkTokenBalance(50,0,50,0);
        await checkMaidCoinBalance(3200,6900,6800,5100);
        await checkClaimableAmount(50,0,5050,0);

        await checkTokenBalance(50,0,50,0);
        await transferToken(alice, dan, 25);
        await mine();
        await checkTokenBalance(25,0,50,25);
        await checkMaidCoinBalance(3250,6900,6800,5100);
        await checkClaimableAmount(0,0,5050,0);

        await token.claim(bob.address);
        await mine();
        await checkMaidCoinBalance(3250,6900,6800,5100);
        await checkClaimableAmount(0,0,5050,0);

        await checkTokenBalance(25,0,50,25);
        await transferToken(alice, dan, 0);
        await mine();
        await checkTokenBalance(25,0,50,25);
        await checkMaidCoinBalance(3250,6900,6800,5100);
        await checkClaimableAmount(0,0,5050,0);
    });
});
