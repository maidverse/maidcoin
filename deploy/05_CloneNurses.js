module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const nursePart = (await get("NursePart")).address;
    const maidCoin = (await get("MaidCoin")).address;
    const theMaster = (await get("TheMaster")).address;

    await deploy("CloneNurses", {
        from: deployer,
        args: [nursePart, maidCoin, theMaster],
        log: true,
    });
};
