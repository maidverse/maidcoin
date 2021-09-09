module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, get } = deployments;

    const maidCoin = (await get("MaidCoin")).address;

    await deploy("MaidCafe", {
        from: deployer,
        args: [maidCoin],
        log: true,
    });
};
