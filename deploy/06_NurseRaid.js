const { getSushiGirlsAddress, getLingerieGirlsAddress, getRNGAddress, multiSigWallet } = require("../scripts/utils");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get, read, execute } = deployments;

    const maidCoin = (await get("MaidCoin")).address;
    const maidCafe = (await get("MaidCafe")).address;
    const nursePart = (await get("NursePart")).address;
    const nurses = (await get("CloneNurses")).address;
    const maids = (await get("Maids")).address;
    
    const chainId = await getChainId();
    const rng = getRNGAddress(chainId);
    const sgirls = getSushiGirlsAddress(chainId);
    const lgirls = getLingerieGirlsAddress(chainId);

    const raid = await deploy("NurseRaid", {
        from: deployer,
        args: [maidCoin, maidCafe, nursePart, nurses, rng, sgirls, lgirls],
        log: true,
    });

    if ((await read("NursePart", { log: true }, "owner")) !== raid.address) {
        console.log("Transfer NursePart Ownership to the NurseRaid");
        await execute("NursePart", { from: deployer }, "transferOwnership", raid.address);
    }

    if (raid.newlyDeployed) {
        console.log("Approve Maids to NurseRaid");
        await execute("NurseRaid", { from: deployer }, "approveMaids", [maids, lgirls, sgirls]);
    }

    if ((await read("NurseRaid", { log: true }, "owner")) !== multiSigWallet) {
        console.log("Transfer NurseRaid Ownership to the multi-sig wallet");
        await execute("NurseRaid", { from: deployer }, "transferOwnership", multiSigWallet);
    }
};
