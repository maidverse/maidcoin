const { ethers } = require("hardhat");

module.exports = {
    pow2: exp => {
        return ethers.BigNumber.from(2).pow(exp);
    },
    pow10: exp => {
        return ethers.BigNumber.from(10).pow(exp);
    },
};
