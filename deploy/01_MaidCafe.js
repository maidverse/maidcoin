const { getWethAddress, multiSigWallet } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const chainId = await getChainId();
    const maidCoin = (await get("MaidCoin")).address;
    const weth = getWethAddress(chainId);

    if(maidCoin !== "0x4Af698B479D0098229DC715655c667Ceb6cd8433") {
        throw new Error("Wrong MaidCoin");
    }

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
