const { ethers } = require("hardhat");

module.exports = {
    tokenAmount: (amount, decimals = 18) => {
        return ethers.BigNumber.from(10).pow(decimals).mul(amount);
    },
};
