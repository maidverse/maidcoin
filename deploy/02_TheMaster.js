const { constants } = require("ethers");
const { getPairAddress, getWethAddress, getSushiAddress } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const chainId = await getChainId();
    const initialRewardPerBlock = constants.WeiPerEther;
    const decreasingInterval = 520000;
    const startBlock = 13266456; // TODO: update
    const maidCoin = (await get("MaidCoin")).address;
    const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
    const sushi = getSushiAddress(chainId);

    await deploy("TheMaster", {
        from: deployer,
        args: [initialRewardPerBlock, decreasingInterval, startBlock, maidCoin, pair, sushi],
        log: true,
    });
};
