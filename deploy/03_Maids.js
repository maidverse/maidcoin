const { getPairAddress, getWethAddress, getSushiAddress } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const chainId = await getChainId();
    const maidCoin = (await get("MaidCoin")).address;
    const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
    const sushi = getSushiAddress(chainId);

    await deploy("Maids", {
        from: deployer,
        args: [pair, sushi],
        log: true,
    });
};
