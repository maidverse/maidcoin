const { constants } = require("ethers");
const { network } = require("hardhat");
const { getPairAddress, getWethAddress, getSushiAddress } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const chainId = await getChainId();
    const initialRewardPerBlock = constants.WeiPerEther;
    const decreasingInterval = 525600;
    const startBlock = 13316000;
    const maidCoin = (await get("MaidCoin")).address;
    const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
    const sushi = getSushiAddress(chainId);

    const theMaster = await deploy("TheMaster", {
        from: deployer,
        args: [initialRewardPerBlock, decreasingInterval, startBlock, maidCoin, pair, sushi],
        log: true,
    });

    if (network.name !== "mainnet") {
        const owner = await read("MaidCoin", {}, "owner");
        if (owner !== theMaster.address) {
            await execute("MaidCoin", { from: deployer }, "transferOwnership", theMaster.address);
        }
    }
};
