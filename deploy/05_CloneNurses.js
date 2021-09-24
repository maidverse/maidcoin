const { multiSigWallet, gasOptions } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const nursePart = (await get("NursePart")).address;
    const maidCoin = (await get("MaidCoin")).address;
    const theMaster = (await get("TheMaster")).address;
    const maidCafe = (await get("MaidCafe")).address;

    if (maidCoin !== "0x4Af698B479D0098229DC715655c667Ceb6cd8433") {
        throw new Error("Wrong MaidCoin");
    }

    await deploy("CloneNurses", {
        from: deployer,
        args: [nursePart, maidCoin, theMaster, maidCafe],
        log: true,
        maxFeePerGas: gasOptions.maxFeePerGas,
        maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
    });

    if ((await read("CloneNurses", { log: true }, "owner")) !== multiSigWallet) {
        console.log("Transfer CloneNurses Ownership to the multi-sig wallet");
        await execute(
            "CloneNurses",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "transferOwnership",
            multiSigWallet
        );
    }
};
