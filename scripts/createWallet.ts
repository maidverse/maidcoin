import hardhat from "hardhat";

const wallet = hardhat.ethers.Wallet.createRandom();
console.log(wallet.address);
console.log(wallet.privateKey);
