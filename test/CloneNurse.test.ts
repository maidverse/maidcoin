import { waffle } from "hardhat";
import CloneNurseArtifact from "../artifacts/contracts/CloneNurse.sol/CloneNurse.json";
import { CloneNurse } from "../typechain";

const { deployContract } = waffle;

describe("CloneNurse", () => {
    let cloneNurse: CloneNurse;

    const provider = waffle.provider;
    const [admin] = provider.getWallets();

    beforeEach(async () => {
        cloneNurse = await deployContract(
            admin,
            CloneNurseArtifact,
            []
        ) as CloneNurse;
    })

    context("new CloneNurse", async () => {
        //TODO:
    })
})
