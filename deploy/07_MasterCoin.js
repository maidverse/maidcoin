require("dotenv").config();
const { getPairAddress, getWethAddress, gasOptions } = require("../scripts/utils");

module.exports = async ({ ethers, getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, execute } = deployments;

    const result = await deploy("MasterCoin", {
        from: deployer,
        args: [],
        log: true,
        maxFeePerGas: gasOptions.maxFeePerGas,
        maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
    });

    {
        console.log("Transfer MasterCoin to the devs");
        await execute(
            "MasterCoin",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "transfer",
            process.env.DEV0,
            ethers.utils.parseEther("27.3")
        );
        await execute(
            "MasterCoin",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "transfer",
            process.env.DEV1,
            ethers.utils.parseEther("27.3")
        );
        await execute(
            "MasterCoin",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "transfer",
            process.env.DEV2,
            ethers.utils.parseEther("27.3")
        );
        await execute(
            "MasterCoin",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "transfer",
            process.env.DEV3,
            ethers.utils.parseEther("15.1")
        );
    }

    if (result.newlyDeployed) {
        const chainId = await getChainId();
        const maidCoin = (await get("MaidCoin")).address;
        const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
        const nurses = (await get("CloneNurses")).address;
        const masterCoin = result.address;

        if (maidCoin !== "0x4Af698B479D0098229DC715655c667Ceb6cd8433") {
            throw new Error("Wrong MaidCoin");
        }

        console.log("Add initial pools to TheMaster");

        await execute(
            "TheMaster",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "add",
            masterCoin,
            false,
            false,
            ethers.constants.AddressZero,
            0,
            100
        );
        await execute(
            "TheMaster",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "add",
            pair,
            false,
            false,
            ethers.constants.AddressZero,
            0,
            600
        );
        await execute(
            "TheMaster",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "add",
            nurses,
            true,
            true,
            ethers.constants.AddressZero,
            0,
            300
        );
        await execute(
            "TheMaster",
            {
                from: deployer,
                maxFeePerGas: gasOptions.maxFeePerGas,
                maxPriorityFeePerGas: gasOptions.maxPriorityFeePerGas,
            },
            "add",
            pair,
            false,
            false,
            nurses,
            30,
            0
        );
    }
};
