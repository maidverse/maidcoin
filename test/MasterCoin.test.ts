import { expect } from "chai";
import { waffle } from "hardhat";
import MasterCoinArtifact from "../artifacts/contracts/MasterCoin.sol/MasterCoin.json";
import { MasterCoin } from "../typechain";
import { expandTo18Decimals } from "./shared/utils/number";

const { deployContract } = waffle;

describe("MasterCoin", () => {
    let masterCoin: MasterCoin;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();
    const totalSupply = expandTo18Decimals(100);

    beforeEach(async () => {
        masterCoin = (await deployContract(admin, MasterCoinArtifact, [])) as MasterCoin;
    });

    context("new MasterCoin", async () => {
        it("has given data", async () => {
            expect(await masterCoin.totalSupply()).to.be.equal(totalSupply);
            expect(await masterCoin.name()).to.be.equal("MasterCoin");
            expect(await masterCoin.symbol()).to.be.equal("$MASTER");
            expect(await masterCoin.decimals()).to.be.equal(18);
        });

        it("check the deployer balance", async () => {
            expect(await masterCoin.balanceOf(admin.address)).to.be.equal(totalSupply);
        });

        it("approve", async () => {
            const value = expandTo18Decimals(10);
            await expect(masterCoin.approve(other.address, value))
                .to.emit(masterCoin, "Approval")
                .withArgs(admin.address, other.address, value);
            expect(await masterCoin.allowance(admin.address, other.address)).to.eq(value);
        });

        it("transfer", async () => {
            const value = expandTo18Decimals(10);
            await expect(masterCoin.transfer(other.address, value))
                .to.emit(masterCoin, "Transfer")
                .withArgs(admin.address, other.address, value);
            expect(await masterCoin.balanceOf(admin.address)).to.eq(totalSupply.sub(value));
            expect(await masterCoin.balanceOf(other.address)).to.eq(value);
        });

        it("transfer:fail", async () => {
            await expect(masterCoin.transfer(other.address, totalSupply.add(1))).to.be.reverted; // ds-math-sub-underflow
            await expect(masterCoin.connect(other).transfer(admin.address, 1)).to.be.reverted; // ds-math-sub-underflow
        });

        it("transferFrom", async () => {
            const value = expandTo18Decimals(10);
            await masterCoin.approve(other.address, value);
            await expect(masterCoin.connect(other).transferFrom(admin.address, other.address, value))
                .to.emit(masterCoin, "Transfer")
                .withArgs(admin.address, other.address, value);
            expect(await masterCoin.allowance(admin.address, other.address)).to.eq(0);
            expect(await masterCoin.balanceOf(admin.address)).to.eq(totalSupply.sub(value));
            expect(await masterCoin.balanceOf(other.address)).to.eq(value);
        });
    });
});
