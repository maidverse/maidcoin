import hardhat, { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/shared/utils/number";
import { CloneNurses, MaidCoin, Maids, MasterCoin, NursePart, NurseRaid, TheMaster } from "../typechain";
import { TestSushiToken } from "../typechain/TestSushiToken";

// Ropsten
//const RNG_ADDRESS = "0x81e75a2EeE8272D017aA3bb983dD782d08F3c702";
//const LP_TOKEN_ADDRESS = "0xF43df1bC8DD096F5f9dF1fB4d676D2ab38592020";

// Kovan
const RNG_ADDRESS = "0x7DB3218Cc8ecAe49fFA8FF3923e90BEE72cbF7Cc";
const LP_TOKEN_ADDRESS = "0x56ac87553c4dBcd877cA7E4fba54959f091CaEdE";

const addresses: { [name: string]: string } = {};

function displayAddress(name: string, address: string) {
    //console.log(`- ${name}: [${address}](https://ropsten.etherscan.io/address/${address})`);
    console.log(`- ${name}: [${address}](https://kovan.etherscan.io/address/${address})`);
    addresses[name] = address;
}

function showAddressesForJSON() {
    console.log("json");
    for (const [name, address] of Object.entries(addresses)) {
        console.log(`${name}: "${address}",`);
    }
}

async function main() {
    console.log("deploy start")

    const MaidCoin = await hardhat.ethers.getContractFactory("MaidCoin")
    const maidCoin = await MaidCoin.deploy() as MaidCoin
    displayAddress("MaidCoin", maidCoin.address)

    const Sushi = await hardhat.ethers.getContractFactory("TestSushiToken")
    const sushi = await Sushi.deploy() as TestSushiToken
    displayAddress("Sushi", sushi.address)

    const TheMaster = await hardhat.ethers.getContractFactory("TheMaster")
    const theMaster = await TheMaster.deploy(
        expandTo18Decimals(50), // initialRewardPerBlock
        100, // decreasingInterval
        await ethers.provider.getBlockNumber() + 10, // startBlock
        maidCoin.address,
        LP_TOKEN_ADDRESS,
        sushi.address
    ) as TheMaster
    displayAddress("TheMaster", theMaster.address)

    await maidCoin.transferOwnership(theMaster.address);

    const Maids = await hardhat.ethers.getContractFactory("Maids")
    const maids = await Maids.deploy(LP_TOKEN_ADDRESS, sushi.address) as Maids
    displayAddress("Maids", maids.address)

    const MasterCoin = await hardhat.ethers.getContractFactory("MasterCoin")
    const masterCoin = await MasterCoin.deploy() as MasterCoin
    displayAddress("MasterCoin", masterCoin.address)

    const NursePart = await hardhat.ethers.getContractFactory("NursePart")
    const nursePart = await NursePart.deploy() as NursePart
    displayAddress("NursePart", nursePart.address)

    const NurseRaid = await hardhat.ethers.getContractFactory("NurseRaid")
    const nurseRaid = await NurseRaid.deploy(
        maids.address,
        maidCoin.address,
        nursePart.address,
        RNG_ADDRESS,
    ) as NurseRaid
    displayAddress("NurseRaid", nurseRaid.address)

    await nursePart.transferOwnership(nurseRaid.address)

    const CloneNurses = await hardhat.ethers.getContractFactory("CloneNurses")
    const cloneNurses = await CloneNurses.deploy(
        nursePart.address,
        maidCoin.address,
        theMaster.address,
    ) as CloneNurses
    displayAddress("CloneNurses", cloneNurses.address)

    await theMaster.add(masterCoin.address, false, false, ethers.constants.AddressZero, 0, 10, {
        gasLimit: 200000,
    });

    // Maid Corp
    await theMaster.add(LP_TOKEN_ADDRESS, false, false, ethers.constants.AddressZero, 0, 9, {
        gasLimit: 200000,
    });

    await theMaster.add(cloneNurses.address, true, true, ethers.constants.AddressZero, 0, 30, {
        gasLimit: 200000,
    });

    // Supporter
    await theMaster.add(LP_TOKEN_ADDRESS, false, false, cloneNurses.address, 10, 51, {
        gasLimit: 200000,
    });

    showAddressesForJSON();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });