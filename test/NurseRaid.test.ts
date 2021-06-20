import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import TestLPTokenArtifact from "../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json";
import MaidArtifact from "../artifacts/contracts/Maid.sol/Maid.json";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import NursePartArtifact from "../artifacts/contracts/NursePart.sol/NursePart.json";
import TestRNGArtifact from "../artifacts/contracts/test/TestRNG.sol/TestRNG.json";
import NurseRaidArtifact from "../artifacts/contracts/NurseRaid.sol/NurseRaid.json";
import { TestLPToken } from "../typechain/TestLPToken";
import { Maid } from "../typechain/Maid";
import { MaidCoin } from "../typechain/MaidCoin";
import { NursePart } from "../typechain/NursePart";
import { TestRNG } from "../typechain/TestRNG";
import { NurseRaid } from "../typechain/NurseRaid";
import { expandTo18Decimals, getERC20ApprovalDigest } from "./shared/utilities";
import { ecsign } from "ethereumjs-util";

const { deployContract } = waffle;

describe("NurseRaid", () => {
    let lpToken: TestLPToken;
    let maid: Maid;
    let maidCoin: MaidCoin;
    let nursePart: NursePart;
    let rng: TestRNG;
    let nurseRaid: NurseRaid;

    const provider = waffle.provider;
    const [admin] = provider.getWallets()

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
    })
})