import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import NurseRaidArtifact from "../artifacts/contracts/NurseRaid.sol/NurseRaid.json";
import { NurseRaid } from "../typechain/NurseRaid";
import { expandTo18Decimals, getERC20ApprovalDigest } from "./shared/utilities";
import { ecsign } from "ethereumjs-util";

const { deployContract } = waffle;

describe("NurseRaid", () => {
    let nurseRaid: NurseRaid;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets()

    const name = "NurseRaid";
    const symbol = "FT";
    const version = "1";

    beforeEach(async () => {
        nurseRaid = await deployContract(
            admin,
            NurseRaidArtifact,
            [name, symbol, version]
        ) as NurseRaid;
    })

    context("new NurseRaid", async () => {
        
    })
})