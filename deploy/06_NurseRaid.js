const { constants } = require("ethers");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const maidCoin = (await get("MaidCoin")).address;
    const maidCafe = (await get("MaidCafe")).address;
    const nursePart = (await get("NursePart")).address;
    const rng = constants.AddressZero; // TODO: replace with the real address

    await deploy("NurseRaid", {
        from: deployer,
        args: [maidCoin, maidCafe, nursePart, rng],
        log: true,
    });
};
