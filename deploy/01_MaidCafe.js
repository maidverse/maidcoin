const { getWethAddress } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const chainId = await getChainId();
    const maidCoin = (await get("MaidCoin")).address;
    const weth = getWethAddress(chainId);

    await deploy("MaidCafe", {
        from: deployer,
        args: [maidCoin, weth],
        log: true,
    });
};
