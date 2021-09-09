const { pack, keccak256 } = require("@ethersproject/solidity");
const { getCreate2Address } = require("@ethersproject/address");
const { constants } = require("ethers");
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

module.exports = {
    INIT_CODE_HASH,
    getSushiAddress,
    getWethAddress,
    getPairAddress,
    getFactoryAddress,
};
