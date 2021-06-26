import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import { MaidCoin } from "../typechain";
import { expandTo18Decimals } from "./utils/number";
import { getERC20ApprovalDigest } from "./utils/standard";

const { deployContract } = waffle;

describe("MaidCoin", () => {
    let maidCoin: MaidCoin;

    const provider = new MockProvider({
        ganacheOptions: {
            hardfork: "istanbul",
            mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
            gasLimit: 99999999999
        }
    });

    const [admin, other] = provider.getWallets();
    const totalSupply = expandTo18Decimals(30000);

    beforeEach(async () => {
        maidCoin = await deployContract(
            admin,
            MaidCoinArtifact,
            []
        ) as MaidCoin;
    })

    context("new MaidCoin", async () => {
        it("has given data", async () => {
            expect(await maidCoin.totalSupply()).to.be.equal(totalSupply)
            expect(await maidCoin.name()).to.be.equal("MaidCoin")
            expect(await maidCoin.symbol()).to.be.equal("$MAID")
            expect(await maidCoin.decimals()).to.be.equal(18)
        })

        it("check the deployer balance", async () => {
            expect(await maidCoin.balanceOf(admin.address)).to.be.equal(totalSupply)
        })

        it("approve", async () => {
            const value = expandTo18Decimals(10)
            await expect(maidCoin.approve(other.address, value))
                .to.emit(maidCoin, "Approval")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.allowance(admin.address, other.address)).to.eq(value)
        })

        it("transfer", async () => {
            const value = expandTo18Decimals(10)
            await expect(maidCoin.transfer(other.address, value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.balanceOf(admin.address)).to.eq(totalSupply.sub(value))
            expect(await maidCoin.balanceOf(other.address)).to.eq(value)
        })

        it("transfer:fail", async () => {
            await expect(maidCoin.transfer(other.address, totalSupply.add(1))).to.be.reverted // ds-math-sub-underflow
            await expect(maidCoin.connect(other).transfer(admin.address, 1)).to.be.reverted // ds-math-sub-underflow
        })

        it("transferFrom", async () => {
            const value = expandTo18Decimals(10)
            await maidCoin.approve(other.address, value)
            await expect(maidCoin.connect(other).transferFrom(admin.address, other.address, value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.allowance(admin.address, other.address)).to.eq(0)
            expect(await maidCoin.balanceOf(admin.address)).to.eq(totalSupply.sub(value))
            expect(await maidCoin.balanceOf(other.address)).to.eq(value)
        })

        it("transferFrom:max", async () => {
            const value = expandTo18Decimals(10)
            await maidCoin.approve(other.address, constants.MaxUint256)
            await expect(maidCoin.connect(other).transferFrom(admin.address, other.address, value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.allowance(admin.address, other.address)).to.eq(constants.MaxUint256)
            expect(await maidCoin.balanceOf(admin.address)).to.eq(totalSupply.sub(value))
            expect(await maidCoin.balanceOf(other.address)).to.eq(value)
        })

        it("mint", async () => {
            const value = expandTo18Decimals(10)
            await expect(maidCoin.mint(other.address, value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(constants.AddressZero, other.address, value)
            expect(await maidCoin.balanceOf(other.address)).to.eq(value)
        })

        it("burn", async () => {
            const value = expandTo18Decimals(10)
            await expect(maidCoin.transfer(other.address, value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.balanceOf(other.address)).to.eq(value)
            await expect(await maidCoin.connect(other).burn(value))
                .to.emit(maidCoin, "Transfer")
                .withArgs(other.address, constants.AddressZero, value)
            expect(await maidCoin.balanceOf(other.address)).to.eq(0)
        })

        it("data for permit", async () => {
            expect(await maidCoin.DOMAIN_SEPARATOR()).to.eq(
                keccak256(
                    defaultAbiCoder.encode(
                        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                        [
                            keccak256(
                                toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
                            ),
                            keccak256(toUtf8Bytes("MaidCoin")),
                            keccak256(toUtf8Bytes("1")),
                            1,
                            maidCoin.address
                        ]
                    )
                )
            )
            expect(await maidCoin.PERMIT_TYPEHASH()).to.eq(
                keccak256(toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"))
            )
        })

        it("permit", async () => {
            const value = expandTo18Decimals(10)

            const nonce = await maidCoin.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                maidCoin,
                { owner: admin.address, spender: other.address, value },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(maidCoin.permit(admin.address, other.address, value, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(maidCoin, "Approval")
                .withArgs(admin.address, other.address, value)
            expect(await maidCoin.allowance(admin.address, other.address)).to.eq(value)
            expect(await maidCoin.nonces(admin.address)).to.eq(BigNumber.from(1))
        })
    })
})