import hardhat from "hardhat";
import { MaidCoin } from "../typechain";

function displayAddress(name: string, address: string) {
    //console.log(`- ${name}: [${address}](https://ropsten.etherscan.io/address/${address})`);
    console.log(`- ${name}: [${address}](https://kovan.etherscan.io/address/${address})`);
}

async function main() {
    console.log("deploy start")

    const MaidCoin = await hardhat.ethers.getContractFactory("MaidCoin")
    const maidCoin = await MaidCoin.deploy() as MaidCoin
    displayAddress("MaidCoin", maidCoin.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
