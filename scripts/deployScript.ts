import hardhat, { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/shared/utils/number";
import { CloneNurse, Maid, MaidCoin, MasterCoin, NursePart, NurseRaid, TestLPToken, TheMaster } from "../typechain";

// Kovan
const RNG = "0x8a39182b6FC57aa3A09099D698161e79623c1232";

function displayAddress(name: string, address: string) {
    console.log(`- ${name}: [${address}](https://kovan.etherscan.io/address/${address})`)
}

async function main() {
    console.log("deploy start")

    const MaidCoin = await hardhat.ethers.getContractFactory("MaidCoin")
    const maidCoin = await MaidCoin.deploy() as MaidCoin
    displayAddress("MaidCoin", maidCoin.address)

    const TheMaster = await hardhat.ethers.getContractFactory("TheMaster")
    const theMaster = await TheMaster.deploy(
        expandTo18Decimals(50), // initialRewardPerBlock
        100, // decreasingInterval
        await ethers.provider.getBlockNumber() + 10, // startBlock
        maidCoin.address,
    ) as TheMaster
    displayAddress("TheMaster", theMaster.address)

    await maidCoin.transferOwnership(theMaster.address);

    const TestLPToken = await hardhat.ethers.getContractFactory("TestLPToken")
    const testLPToken = await TestLPToken.deploy() as TestLPToken
    displayAddress("TestLPToken", testLPToken.address)

    const Maid = await hardhat.ethers.getContractFactory("Maid")
    const maid = await Maid.deploy(testLPToken.address) as Maid
    displayAddress("Maid", maid.address)

    const MasterCoin = await hardhat.ethers.getContractFactory("MasterCoin")
    const masterCoin = await MasterCoin.deploy() as MasterCoin
    displayAddress("MasterCoin", masterCoin.address)

    const NursePart = await hardhat.ethers.getContractFactory("NursePart")
    const nursePart = await NursePart.deploy() as NursePart
    displayAddress("NursePart", nursePart.address)

    const NurseRaid = await hardhat.ethers.getContractFactory("NurseRaid")
    const nurseRaid = await NurseRaid.deploy(
        maid.address,
        maidCoin.address,
        nursePart.address,
        RNG,
    ) as NurseRaid
    displayAddress("NurseRaid", nurseRaid.address)

    await nursePart.transferOwnership(nurseRaid.address)

    const CloneNurse = await hardhat.ethers.getContractFactory("CloneNurse")
    const cloneNurse = await CloneNurse.deploy(
        nursePart.address,
        maidCoin.address,
        theMaster.address,
    ) as CloneNurse
    displayAddress("CloneNurse", cloneNurse.address)

    await theMaster.add(masterCoin.address, false, false, ethers.constants.AddressZero, 0, 10);
    await theMaster.add(testLPToken.address, false, false, ethers.constants.AddressZero, 0, 9);
    await theMaster.add(cloneNurse.address, true, true, ethers.constants.AddressZero, 0, 30);
    await theMaster.add(testLPToken.address, false, false, cloneNurse.address, 10, 51);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
