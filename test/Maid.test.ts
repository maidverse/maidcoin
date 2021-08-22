import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import MaidArtifact from "../artifacts/contracts/Maid.sol/Maid.json";
import TestLPTokenArtifact from "../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json";
import { Maid, TestLPToken } from "../typechain";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC721ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("Maid", () => {
    let testLPToken: TestLPToken;
    let maid: Maid;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();

    beforeEach(async () => {

        testLPToken = await deployContract(
            admin,
            TestLPTokenArtifact,
            []
        ) as TestLPToken;

        maid = await deployContract(
            admin,
            MaidArtifact,
            [testLPToken.address]
        ) as Maid;
    })

    context("new Maid", async () => {
        it("name, symbol, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async () => {
            const name = await maid.name()
            expect(name).to.eq("MaidCoin Maids")
            expect(await maid.symbol()).to.eq("MAID")
            expect(await maid.DOMAIN_SEPARATOR()).to.eq(
                keccak256(
                    defaultAbiCoder.encode(
                        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                        [
                            keccak256(
                                toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
                            ),
                            keccak256(toUtf8Bytes(name)),
                            keccak256(toUtf8Bytes("1")),
                            31337,
                            maid.address
                        ]
                    )
                )
            )
            expect(await maid.PERMIT_TYPEHASH()).to.eq(
                keccak256(toUtf8Bytes("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)"))
            )
        })

        it("changeLPTokenToMaidPower", async () => {
            expect(await maid.lpTokenToMaidPower()).to.eq(BigNumber.from(1))
            await expect(maid.changeLPTokenToMaidPower(BigNumber.from(2)))
                .to.emit(maid, "ChangeLPTokenToMaidPower")
                .withArgs(BigNumber.from(2))
            expect(await maid.lpTokenToMaidPower()).to.eq(BigNumber.from(2))
        })

        it("mint, powerOf", async () => {

            const id = BigNumber.from(0);
            const power = BigNumber.from(12);

            await expect(maid.mint(power))
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id)
            expect(await maid.powerOf(id)).to.eq(power)
            expect(await maid.totalSupply()).to.eq(BigNumber.from(1))
            expect(await maid.tokenURI(id)).to.eq(`https://api.maidcoin.org/maids/${id}`)
        })

        it("batch mint", async () => {

            const id1 = BigNumber.from(0);
            const id2 = BigNumber.from(1);
            const power1 = BigNumber.from(12);
            const power2 = BigNumber.from(15);

            await expect(maid.batchMint([power1, power2]))
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id1)
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id2)

            expect(await maid.powerOf(id1)).to.eq(power1)
            expect(await maid.totalSupply()).to.eq(BigNumber.from(2))
            expect(await maid.tokenURI(id1)).to.eq(`https://api.maidcoin.org/maids/${id1}`)

            expect(await maid.powerOf(id2)).to.eq(power2)
            expect(await maid.totalSupply()).to.eq(BigNumber.from(2))
            expect(await maid.tokenURI(id2)).to.eq(`https://api.maidcoin.org/maids/${id2}`)
        })

        it("support, powerOf", async () => {

            const id = BigNumber.from(0);
            const power = BigNumber.from(12);
            const token = BigNumber.from(100);

            await testLPToken.mint(admin.address, token);
            await testLPToken.approve(maid.address, token);

            await expect(maid.mint(power))
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id)
            await expect(maid.support(id, token))
                .to.emit(maid, "Support")
                .withArgs(id, token)
            expect(await maid.powerOf(id)).to.eq(power.add(token.mul(await maid.lpTokenToMaidPower()).div(expandTo18Decimals(1))))
        })

        it("desupport, powerOf", async () => {

            const id = BigNumber.from(0);
            const power = BigNumber.from(12);
            const token = BigNumber.from(100);

            await testLPToken.mint(admin.address, token);
            await testLPToken.approve(maid.address, token);

            await expect(maid.mint(power))
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id)
            await expect(maid.support(id, token))
                .to.emit(maid, "Support")
                .withArgs(id, token)
            expect(await maid.powerOf(id)).to.eq(power.add(token.mul(await maid.lpTokenToMaidPower()).div(expandTo18Decimals(1))))
            await expect(maid.desupport(id, token))
                .to.emit(maid, "Desupport")
                .withArgs(id, token)
            expect(await maid.powerOf(id)).to.eq(power)
        })

        it("permit", async () => {

            const id = BigNumber.from(0);

            await expect(maid.mint(BigNumber.from(12)))
                .to.emit(maid, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id)

            const nonce = await maid.nonces(id)
            const deadline = constants.MaxUint256
            const digest = await getERC721ApprovalDigest(
                maid,
                { spender: other.address, id },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(maid.permit(other.address, id, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(maid, "Approval")
                .withArgs(admin.address, other.address, id)
            expect(await maid.getApproved(id)).to.eq(other.address)
            expect(await maid.nonces(id)).to.eq(BigNumber.from(1))
        })
    })
})
