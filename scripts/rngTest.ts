import hardhat from "hardhat";
import { TestRNG } from "../typechain";

async function main() {
    console.log("test start")
    const TestRNG = await hardhat.ethers.getContractFactory("TestRNG")
    const testRNG = TestRNG.attach("0xb0c63655bB4d89a1392F2cEedf0C9c4f3efEb0F7") as TestRNG
    const result = await testRNG.callStatic.generateRandomNumber(0, "0xEB3b418e4A4430392Cd57b1356c5B1d2205A56d9");
    console.log(result.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });