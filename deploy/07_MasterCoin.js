module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    await deploy("MasterCoin", {
        from: deployer,
        args: [],
        log: true,
    });
};
