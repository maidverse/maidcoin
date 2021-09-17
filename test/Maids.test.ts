import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import MaidsArtifact from "../artifacts/contracts/Maids.sol/Maids.json";
import TestLPTokenArtifact from "../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json";
import TestSushiArtifact from "../artifacts/contracts/test/TestSushiToken.sol/TestSushiToken.json";
import { Maids, TestLPToken, TestSushiToken } from "../typechain";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC721ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("Maids", () => {
    let testLPToken: TestLPToken;
    let maids: Maids;
    let sushi: TestSushiToken;

    const provider = waffle.provider;
    const [admin, other, royaltyRecepient] = provider.getWallets();

    beforeEach(async () => {
        testLPToken = (await deployContract(admin, TestLPTokenArtifact, [])) as TestLPToken;
        sushi = (await deployContract(admin, TestSushiArtifact, [])) as TestSushiToken;

        maids = (await deployContract(admin, MaidsArtifact, [testLPToken.address, sushi.address, royaltyRecepient.address])) as Maids;
    });

    context("new Maids", async () => {
        it("name, symbol, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async () => {
            const name = await maids.name();
            expect(name).to.eq("MaidCoin Maids");
            expect(await maids.symbol()).to.eq("MAIDS");
            expect(await maids.DOMAIN_SEPARATOR()).to.eq(
                keccak256(
                    defaultAbiCoder.encode(
                        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                        [
                            keccak256(
                                toUtf8Bytes(
                                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                                )
                            ),
                            keccak256(toUtf8Bytes(name)),
                            keccak256(toUtf8Bytes("1")),
                            31337,
                            maids.address,
                        ]
                    )
                )
            );
            expect(await maids.PERMIT_TYPEHASH()).to.eq(
                keccak256(toUtf8Bytes("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)"))
            );
        });

        it("mint, powerOf", async () => {
            const id = BigNumber.from(0);
            const power = BigNumber.from(12);

            await expect(maids.mint(power))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id);
            // expect(await maids.powerOf(id)).to.eq(power);
            expect(await maids.totalSupply()).to.eq(BigNumber.from(1));
            expect(await maids.tokenURI(id)).to.eq(`https://api.maidcoin.org/maids/${id}`);
        });

        it("batch mint", async () => {
            const id1 = BigNumber.from(0);
            const id2 = BigNumber.from(1);
            const power1 = BigNumber.from(12);
            const power2 = BigNumber.from(15);

            await expect(maids.mintBatch([power1, power2], 2))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id1)
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id2);

            // expect(await maids.powerOf(id1)).to.eq(power1);
            expect(await maids.totalSupply()).to.eq(BigNumber.from(2));
            expect(await maids.tokenURI(id1)).to.eq(`https://api.maidcoin.org/maids/${id1}`);

            // expect(await maids.powerOf(id2)).to.eq(power2);
            expect(await maids.totalSupply()).to.eq(BigNumber.from(2));
            expect(await maids.tokenURI(id2)).to.eq(`https://api.maidcoin.org/maids/${id2}`);
        });

        it("support, powerOf", async () => {
            const id = BigNumber.from(0);
            const power = BigNumber.from(12);
            const token = BigNumber.from(100);

            await testLPToken.mint(admin.address, token);
            await testLPToken.approve(maids.address, token);

            await expect(maids.mint(power))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id);
            await expect(maids.support(id, token)).to.emit(maids, "Support").withArgs(id, token);
            // expect(await maids.powerOf(id)).to.eq(
            //     power.add(token.mul(await maids.lpTokenToMaidPower()).div(expandTo18Decimals(1)))
            // );
        });

        it("desupport, powerOf", async () => {
            const id = BigNumber.from(0);
            const power = BigNumber.from(12);
            const token = BigNumber.from(100);

            await testLPToken.mint(admin.address, token);
            await testLPToken.approve(maids.address, token);

            await expect(maids.mint(power))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id);
            await expect(maids.support(id, token)).to.emit(maids, "Support").withArgs(id, token);
            // expect(await maids.powerOf(id)).to.eq(
            //     power.add(token.mul(await maids.lpTokenToMaidPower()).div(expandTo18Decimals(1)))
            // );
            await expect(maids.desupport(id, token)).to.emit(maids, "Desupport").withArgs(id, token);
            // expect(await maids.powerOf(id)).to.eq(power);
        });

        it("permit", async () => {
            const id = BigNumber.from(0);

            await expect(maids.mint(BigNumber.from(12)))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id);

            const nonce = await maids.nonces(id);
            const deadline = constants.MaxUint256;
            const digest = await getERC721ApprovalDigest(maids, { spender: other.address, id }, nonce, deadline);

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await expect(maids.permit(other.address, id, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(maids, "Approval")
                .withArgs(admin.address, other.address, id);
            expect(await maids.getApproved(id)).to.eq(other.address);
            expect(await maids.nonces(id)).to.eq(BigNumber.from(1));
        });
    });
});
