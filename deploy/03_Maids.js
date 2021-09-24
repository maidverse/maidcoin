const { getPairAddress, getWethAddress, getSushiAddress, multiSigWallet } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const chainId = await getChainId();
    const maidCoin = (await get("MaidCoin")).address;
    const maidCafe = (await get("MaidCafe")).address;
    const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
    const sushi = getSushiAddress(chainId);

    await deploy("Maids", {
        from: deployer,
        args: [pair, sushi, maidCafe],
        log: true,
    });

    if ((await read("Maids", {log: true}, "owner")) !== multiSigWallet) {
        console.log("Transfer Maids Ownership to the multi-sig wallet");
        await execute("Maids", { from: deployer }, "transferOwnership", multiSigWallet);
    }
};
