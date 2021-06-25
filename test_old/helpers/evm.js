const { ethers } = require("hardhat");
const { expect } = require("chai");

module.exports = {
    mine: async (count = 1) => {
        expect(count).to.be.gt(0);
        for (let i = 0; i < count; i++) {
            await ethers.provider.send("evm_mine", []);
        }
    },
};
