const { gasOptions } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const maidCafe = (await get("MaidCafe")).address;

    await deploy("NursePart", {
        from: deployer,
        args: [maidCafe],
        log: true,
        maxFeePerGas: gasOptions.maxFeePerGas,
        maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
    });
};
