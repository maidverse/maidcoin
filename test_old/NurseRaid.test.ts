import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { hexlify } from "ethers/lib/utils";
import { waffle } from "hardhat";
import MaidArtifact from "../artifacts/contracts/Maid.sol/Maid.json";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import NursePartArtifact from "../artifacts/contracts/NursePart.sol/NursePart.json";
import NurseRaidArtifact from "../artifacts/contracts/NurseRaid.sol/NurseRaid.json";
import TestLPTokenArtifact from "../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json";
import TestRNGArtifact from "../artifacts/contracts/test/TestRNG.sol/TestRNG.json";
import { Maid } from "../typechain/Maid";
import { MaidCoin } from "../typechain/MaidCoin";
import { NursePart } from "../typechain/NursePart";
import { NurseRaid } from "../typechain/NurseRaid";
import { TestLPToken } from "../typechain/TestLPToken";
import { TestRNG } from "../typechain/TestRNG";
import { expandTo18Decimals, getERC20ApprovalDigest, getERC721ApprovalAllDigest } from "./shared/utilities";

const { deployContract } = waffle;

describe("NurseRaid", () => {
    const provider = new MockProvider({
        ganacheOptions: {
            hardfork: "istanbul",
            mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
            gasLimit: 99999999
        }
    })

    let lpToken: TestLPToken;
    let maid: Maid;
    let maidCoin: MaidCoin;
    let nursePart: NursePart;
    let rng: TestRNG;
    let nurseRaid: NurseRaid;

    const [admin, other] = provider.getWallets()

    beforeEach(async () => {
        lpToken = await deployContract(admin, TestLPTokenArtifact, []) as TestLPToken;
        maid = await deployContract(admin, MaidArtifact, [lpToken.address]) as Maid;
        maidCoin = await deployContract(admin, MaidCoinArtifact, []) as MaidCoin;
        nursePart = await deployContract(admin, NursePartArtifact, []) as NursePart;
        rng = await deployContract(admin, TestRNGArtifact, []) as TestRNG;
        nurseRaid = await deployContract(admin, NurseRaidArtifact, [
            maid.address,
            maidCoin.address,
            nursePart.address,
            rng.address
        ]) as NurseRaid;
    })

    context("new NurseRaid", async () => {
        it("change maid power to raid reduced block", async () => {
            expect(await nurseRaid.maidPowerToRaidReducedBlock()).to.be.equal(1)
            await nurseRaid.changeMaidPowerToRaidReducedBlock(2)
            expect(await nurseRaid.maidPowerToRaidReducedBlock()).to.be.equal(2)
        })

        it("create raid", async () => {
            await expect(nurseRaid.create(expandTo18Decimals(10), 0, 5, 10, 999999999))
                .to.emit(nurseRaid, "Create")
                .withArgs(0, expandTo18Decimals(10), 0, 5, 10, 999999999)
            expect((await nurseRaid.raids(0)).entranceFee).to.be.equal(expandTo18Decimals(10))
            expect((await nurseRaid.raids(0)).nursePart).to.be.equal(0)
            expect((await nurseRaid.raids(0)).maxRewardCount).to.be.equal(5)
            expect((await nurseRaid.raids(0)).duration).to.be.equal(10)
            expect((await nurseRaid.raids(0)).endBlock).to.be.equal(999999999)
        })
    })

    it("enter", async () => {
        await maid.mint(BigNumber.from(10));
        await maid.mint(BigNumber.from(12));

        await expect(nurseRaid.create(expandTo18Decimals(10), 0, 5, 10, 999999999))
            .to.emit(nurseRaid, "Create")
            .withArgs(0, expandTo18Decimals(10), 0, 5, 10, 999999999)
        expect((await nurseRaid.raids(0)).entranceFee).to.be.equal(expandTo18Decimals(10))
        expect((await nurseRaid.raids(0)).nursePart).to.be.equal(0)
        expect((await nurseRaid.raids(0)).maxRewardCount).to.be.equal(5)
        expect((await nurseRaid.raids(0)).duration).to.be.equal(10)
        expect((await nurseRaid.raids(0)).endBlock).to.be.equal(999999999)

        const deadline = constants.MaxUint256

        const nonce1 = await maidCoin.nonces(admin.address)
        const digest1 = await getERC20ApprovalDigest(
            maidCoin,
            { owner: admin.address, spender: nurseRaid.address, value: constants.MaxUint256 },
            nonce1,
            deadline
        )

        const ecsignResult1 = ecsign(Buffer.from(digest1.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

        const nonce2 = await maid.nonces(admin.address)
        const digest2 = await getERC721ApprovalAllDigest(
            maid,
            { owner: admin.address, spender: nurseRaid.address },
            nonce2,
            deadline
        )

        const ecsignResult2 = ecsign(Buffer.from(digest2.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

        await expect(nurseRaid.enterWithPermitAll(0, [0, 1], deadline,
            ecsignResult1.v, hexlify(ecsignResult1.r), hexlify(ecsignResult1.s),
            ecsignResult2.v, hexlify(ecsignResult2.r), hexlify(ecsignResult2.s)))
            .to.emit(nurseRaid, "Enter")
            .withArgs(admin.address, 0, [0, 1])
    })
})