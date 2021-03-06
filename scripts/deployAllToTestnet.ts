import hardhat, { ethers } from "hardhat";
import { expandTo18Decimals } from "../test/shared/utils/number";
import { CloneNurses, MaidCafe, MaidCoin, Maids, MasterCoin, NursePart, NurseRaid, TheMaster } from "../typechain";
import { TestMaidCoin } from "../typechain/TestMaidCoin";
import { TestSushiToken } from "../typechain/TestSushiToken";

// Ropsten
const RNG_ADDRESS = "0x81e75a2EeE8272D017aA3bb983dD782d08F3c702";
const LP_TOKEN_ADDRESS = "0xF43df1bC8DD096F5f9dF1fB4d676D2ab38592020";
const WETH = "0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5";
const SUSHI = "0x81db9c598b3ebbdc92426422fc0a1d06e77195ec";
const SUSHU_GIRLS = "0x9fF326fecc05A5560Eea1A66C6c62a93a64afaFb";
const LINGERIE_GIRLS = "0xf35f860762540929B3157765B82E6616664f7e97";

// Kovan
/*const RNG_ADDRESS = "0x7DB3218Cc8ecAe49fFA8FF3923e90BEE72cbF7Cc";
const LP_TOKEN_ADDRESS = "0x56ac87553c4dBcd877cA7E4fba54959f091CaEdE";
const WETH = "0xd0a1e359811322d97991e03f863a0c30c2cf029c";
const SUSHI = "0xcd280c22F70d6f58B34a1cCbd41780979BBC2F3B";
const SUSHU_GIRLS = "0xd48ec06ee1e1016c159415262A2dFa233E325C2F";
const LINGERIE_GIRLS = "0xB555cA9C88CeB8ece57b9223AA6D7407dD273656";*/

const addresses: { [name: string]: string } = {};

function displayAddress(name: string, address: string) {
    console.log(`- ${name}: [${address}](https://ropsten.etherscan.io/address/${address})`);
    //console.log(`- ${name}: [${address}](https://kovan.etherscan.io/address/${address})`);
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

    const MaidCoin = await hardhat.ethers.getContractFactory("TestMaidCoin")
    const maidCoin = await MaidCoin.deploy() as TestMaidCoin
    //const maidCoin = MaidCoin.attach("0xBFE99524A68DBa35C092733aD4d2F3924cf355a6") as MaidCoin
    displayAddress("MaidCoin", maidCoin.address)

    const MaidCafe = await hardhat.ethers.getContractFactory("MaidCafe")
    const maidCafe = await MaidCafe.deploy(maidCoin.address, WETH) as MaidCafe
    //const maidCafe = MaidCafe.attach("0xD7C87cC885170a2F8b57df41eEC4Bb8e30B03A4A") as MaidCafe
    displayAddress("MaidCafe", maidCafe.address)

    const TheMaster = await hardhat.ethers.getContractFactory("TheMaster")
    const theMaster = await TheMaster.deploy(
        expandTo18Decimals(50), // initialRewardPerBlock
        100, // decreasingInterval
        await ethers.provider.getBlockNumber() + 10, // startBlock
        maidCoin.address,
        LP_TOKEN_ADDRESS,
        SUSHI
    ) as TheMaster
    //const theMaster = TheMaster.attach("0xaA14f1118B7799976D6B7b9a9443315fEa634C10") as TheMaster
    displayAddress("TheMaster", theMaster.address)

    await maidCoin.transferOwnership(theMaster.address);

    const Maids = await hardhat.ethers.getContractFactory("Maids")
    const maids = await Maids.deploy(LP_TOKEN_ADDRESS, SUSHI, maidCafe.address) as Maids
    //const maids = Maids.attach("0xBF9749052d98192672fcF710e77d6C81893d69b7") as Maids
    displayAddress("Maids", maids.address)

    const MasterCoin = await hardhat.ethers.getContractFactory("MasterCoin")
    const masterCoin = await MasterCoin.deploy() as MasterCoin
    //const masterCoin = MasterCoin.attach("0x9d8a6A6B5430A2e5B2b1Bf538b5d5E43eE2439dF") as MasterCoin
    displayAddress("MasterCoin", masterCoin.address)

    const NursePart = await hardhat.ethers.getContractFactory("NursePart")
    const nursePart = await NursePart.deploy(maidCafe.address) as NursePart
    //const nursePart = NursePart.attach("0x22a9edfAe63303CA9cC6536880204b831aF916a9") as NursePart
    displayAddress("NursePart", nursePart.address)

    const CloneNurses = await hardhat.ethers.getContractFactory("CloneNurses")
    const cloneNurses = await CloneNurses.deploy(
        nursePart.address,
        maidCoin.address,
        theMaster.address,
        maidCafe.address,
    ) as CloneNurses
    //const cloneNurses = CloneNurses.attach("0x94c5783AFA16e8a830b5084683D1c23b9EbFA339") as CloneNurses
    displayAddress("CloneNurses", cloneNurses.address)

    const NurseRaid = await hardhat.ethers.getContractFactory("NurseRaid")
    const nurseRaid = await NurseRaid.deploy(
        maidCoin.address,
        maidCafe.address,
        nursePart.address,
        cloneNurses.address,
        RNG_ADDRESS,
        SUSHU_GIRLS,
        LINGERIE_GIRLS,
    ) as NurseRaid
    //const nurseRaid = NurseRaid.attach("0xCA10c109684db65Ced13B09598652558c1056a0C") as NurseRaid
    displayAddress("NurseRaid", nurseRaid.address)

    await nurseRaid.approveMaids([maids.address, SUSHU_GIRLS, LINGERIE_GIRLS]);
    await nursePart.transferOwnership(nurseRaid.address)

    let run = async () => {
        await theMaster.add(masterCoin.address, false, false, ethers.constants.AddressZero, 0, 10);
        await new Promise((resolve) => setTimeout(resolve, 30000));
        if ((await theMaster.poolCount()).toNumber() < 1) {
            await run();
        } else {
            console.log("Added MasterCoin Pool");
        }
    };
    await run();

    // Maid Corp
    run = async () => {
        await theMaster.add(LP_TOKEN_ADDRESS, false, false, ethers.constants.AddressZero, 0, 9);
        await new Promise((resolve) => setTimeout(resolve, 30000));
        if ((await theMaster.poolCount()).toNumber() < 2) {
            await run();
        } else {
            console.log("Added MaidCorp Pool");
        }
    };
    await run();
    
    run = async () => {
        await theMaster.add(cloneNurses.address, true, true, ethers.constants.AddressZero, 0, 30);
        await new Promise((resolve) => setTimeout(resolve, 30000));
        if ((await theMaster.poolCount()).toNumber() < 3) {
            await run();
        } else {
            console.log("Added CloneNurse Pool");
        }
    };
    await run();

    // Supporter
    run = async () => {
        await theMaster.add(LP_TOKEN_ADDRESS, false, false, cloneNurses.address, 10, 51);
        await new Promise((resolve) => setTimeout(resolve, 30000));
        if ((await theMaster.poolCount()).toNumber() < 4) {
            await run();
        } else {
            console.log("Added Supporter Pool");
        }
    };
    await run();

    console.log((await theMaster.poolInfo(0))[4].toNumber());
    console.log((await theMaster.poolInfo(1))[4].toNumber());
    console.log((await theMaster.poolInfo(2))[4].toNumber());
    console.log((await theMaster.poolInfo(3))[4].toNumber());
    //return;

    showAddressesForJSON();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });