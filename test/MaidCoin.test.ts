import { expect } from "chai";
import { deployContract, MockProvider } from "ethereum-waffle";
import { ecsign } from "ethereumjs-util";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import { MaidCoin } from "../typechain/MaidCoin";
import { expandTo18Decimals } from "./utils/number";
import { getERC20ApprovalDigest } from "./utils/standard";

const TOTAL_SUPPLY = expandTo18Decimals(30000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe("MaidCoin", () => {
    const provider = new MockProvider({
        ganacheOptions: {
            hardfork: "istanbul",
            mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
            gasLimit: 9999999
        }
    })
    const [wallet, other] = provider.getWallets()

    let contract: Contract
    beforeEach(async () => {
        contract = await deployContract(wallet, MaidCoinArtifact, []) as MaidCoin
    })

    it("name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async () => {
        const name = await contract.name()
        expect(name).to.eq("MaidCoin")
        expect(await contract.symbol()).to.eq("$MAID")
        expect(await contract.decimals()).to.eq(18)
        expect(await contract.totalSupply()).to.eq(TOTAL_SUPPLY)
        expect(await contract.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY)
        expect(await contract.DOMAIN_SEPARATOR()).to.eq(
            ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                    [
                        ethers.utils.keccak256(
                            ethers.utils.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
                        ),
                        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
                        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
                        1,
                        contract.address
                    ]
                )
            )
        )
        expect(await contract.PERMIT_TYPEHASH()).to.eq(
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"))
        )
    })

    it("approve", async () => {
        await expect(contract.approve(other.address, TEST_AMOUNT))
            .to.emit(contract, "Approval")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
    })

    it("transfer", async () => {
        await expect(contract.transfer(other.address, TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await contract.balanceOf(other.address)).to.eq(TEST_AMOUNT)
    })

    it("transfer:fail", async () => {
        await expect(contract.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
        await expect(contract.connect(other).transfer(wallet.address, 1)).to.be.reverted // ds-math-sub-underflow
    })

    it("transferFrom", async () => {
        await contract.approve(other.address, TEST_AMOUNT)
        await expect(contract.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.allowance(wallet.address, other.address)).to.eq(0)
        expect(await contract.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await contract.balanceOf(other.address)).to.eq(TEST_AMOUNT)
    })

    it("transferFrom:max", async () => {
        await contract.approve(other.address, ethers.constants.MaxUint256)
        await expect(contract.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.allowance(wallet.address, other.address)).to.eq(ethers.constants.MaxUint256)
        expect(await contract.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await contract.balanceOf(other.address)).to.eq(TEST_AMOUNT)
    })

    it("mint", async () => {
        await expect(contract.connect(other).mint(other.address, TEST_AMOUNT)).to.be.reverted
        await expect(contract.mint(other.address, TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(ethers.constants.AddressZero, other.address, TEST_AMOUNT)
        expect(await contract.balanceOf(other.address)).to.eq(TEST_AMOUNT)
    })

    it("burn", async () => {
        await expect(contract.transfer(other.address, TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.balanceOf(other.address)).to.eq(TEST_AMOUNT)
        await expect(await contract.connect(other).burn(TEST_AMOUNT))
            .to.emit(contract, "Transfer")
            .withArgs(other.address, ethers.constants.AddressZero, TEST_AMOUNT)
        expect(await contract.balanceOf(other.address)).to.eq(0)
    })

    it("permit", async () => {
        const nonce = await contract.nonces(wallet.address)
        const deadline = ethers.constants.MaxUint256
        const digest = await getERC20ApprovalDigest(
            contract,
            { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
            nonce,
            deadline
        )

        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(wallet.privateKey.slice(2), "hex"))

        await expect(contract.permit(wallet.address, other.address, TEST_AMOUNT, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s)))
            .to.emit(contract, "Approval")
            .withArgs(wallet.address, other.address, TEST_AMOUNT)
        expect(await contract.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
        expect(await contract.nonces(wallet.address)).to.eq(BigNumber.from(1))
    })
})