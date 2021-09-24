const { getWethAddress, multiSigWallet } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const chainId = await getChainId();
    const maidCoin = (await get("MaidCoin")).address;
    const weth = getWethAddress(chainId);

    await deploy("MaidCafe", {
        from: deployer,
        args: [maidCoin, weth],
        log: true,
    });

    if ((await read("MaidCafe", {log: true}, "owner")) !== multiSigWallet) {
        console.log("Transfer MaidCafe Ownership to the multi-sig wallet");
        await execute("MaidCafe", { from: deployer }, "transferOwnership", multiSigWallet);
    }
};
