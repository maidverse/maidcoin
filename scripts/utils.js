const { pack, keccak256 } = require("@ethersproject/solidity");
const { getCreate2Address } = require("@ethersproject/address");
const { constants, utils } = require("ethers");
const { WETH } = require("@sushiswap/sdk");

const INIT_CODE_HASH = "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303";

const getSushiAddress = chainId => {
    return chainId === "1"
        ? "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
        : "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F";
};

const getWethAddress = chainId => {
    const weth = WETH[chainId];
    return weth ? weth.address : constants.AddressZero;
};

const getPairAddress = (chainId, tokenAddress0, tokenAddress1) => {
    return getCreate2Address(
        getFactoryAddress(chainId),
        keccak256(["bytes"], [pack(["address", "address"], [tokenAddress0, tokenAddress1])]),
        INIT_CODE_HASH
    );
};

const getFactoryAddress = chainId => {
    if (chainId === "1") {
        return "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
    } else {
        return "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
    }
};

const multiSigWallet = "0x30080df30F21a710B31F5fC7FA149a5c452eABFa";

const getSushiGirlsAddress = chainId => {
    if(chainId === "1") {
        return "0xEB3b418e4A4430392Cd57b1356c5B1d2205A56d9";
    } else if(chainId === "3") {
        return "0x9fF326fecc05A5560Eea1A66C6c62a93a64afaFb";
    } else if(chainId === "42") {
        return "0xC85A160adbb5E7D22E0d764f03207090ae72197F";
    } else {
        throw new Error("Network not supported");
    }
};

const getLingerieGirlsAddress = chainId => {
    if(chainId === "1") {
        return "0x579a60fbc649d3398f13e0385dbe79b3ffad757c";
    } else if(chainId === "3") {
        return "0xf35f860762540929B3157765B82E6616664f7e97";
    } else if(chainId === "42") {
        return "0xB555cA9C88CeB8ece57b9223AA6D7407dD273656";
    } else {
        throw new Error("Network not supported");
    }
};

const getRNGAddress = chainId => {
    if(chainId === "1") {
        return "0xb0c63655bB4d89a1392F2cEedf0C9c4f3efEb0F7";
    } else if(chainId === "3") {
        return "0x188d3C00FEC2e410DFDca7aaF0e0D386B0419603";
    } else if(chainId === "42") {
        return "0x965B1c306b7AFc8C680185D72B26a32520B971b8";
    } else {
        throw new Error("Network not supported");
    }
};

const gasOptions = {
    maxFeePerGas: utils.parseUnits("120", 9),
    maxPriorityFeePerGas: utils.parseUnits("1.1", 9),
}

module.exports = {
    INIT_CODE_HASH,
    getSushiAddress,
    getWethAddress,
    getPairAddress,
    getFactoryAddress,
    multiSigWallet,
    getSushiGirlsAddress,
    getLingerieGirlsAddress,
    getRNGAddress,
    gasOptions,
};
