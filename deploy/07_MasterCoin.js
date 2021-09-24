require("dotenv").config();
const { getPairAddress, getWethAddress } = require("../scripts/utils");

module.exports = async ({ ethers, getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, execute } = deployments;

    const result = await deploy("MasterCoin", {
        from: deployer,
        args: [],
        log: true,
    });

    {
        console.log("Transfer MasterCoin to the devs");
        await execute("MasterCoin", { from: deployer }, "transfer", process.env.DEV0, ethers.utils.parseEther("27.3"));
        await execute("MasterCoin", { from: deployer }, "transfer", process.env.DEV1, ethers.utils.parseEther("27.3"));
        await execute("MasterCoin", { from: deployer }, "transfer", process.env.DEV2, ethers.utils.parseEther("27.3"));
        await execute("MasterCoin", { from: deployer }, "transfer", process.env.DEV3, ethers.utils.parseEther("15.1"));
    }

    if (result.newlyDeployed) {
        const chainId = await getChainId();
        const pair = getPairAddress(chainId, maidCoin, getWethAddress(chainId));
        const nurses = (await get("CloneNurses")).address;
        const masterCoin = result.address;

        console.log("Add initial pools to TheMaster");
        
        await execute("TheMaster", { from: deployer }, "add", masterCoin, false, false, ethers.constants.AddressZero, 0, 100);
        await execute("TheMaster", { from: deployer }, "add", pair, false, false, ethers.constants.AddressZero, 0, 600);
        await execute("TheMaster", { from: deployer }, "add", nurses, true, true, ethers.constants.AddressZero, 0, 300);
        await execute("TheMaster", { from: deployer }, "add", pair, false, false, nurses, 30, 0);
    }
};
