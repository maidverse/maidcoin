import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle, ethers } from "hardhat";
import MaidCoinArtifact from "../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import MaidCafeArtifact from "../artifacts/contracts/MaidCafe.sol/MaidCafe.json";
import { MaidCoin, MaidCafe } from "../typechain";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC20ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("MaidCafe", () => {
    let maidCafe: MaidCafe;
    let maidCoin: MaidCoin;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();

    beforeEach(async () => {
        maidCoin = (await deployContract(admin, MaidCoinArtifact, [])) as MaidCoin;

        maidCafe = (await deployContract(admin, MaidCafeArtifact, [maidCoin.address])) as MaidCafe;
    });

    context("new MaidCafe", async () => {
        it("has given data", async () => {
            expect(await maidCafe.name()).to.be.equal("Maid Cafe");
            expect(await maidCafe.symbol()).to.be.equal("OMU");
            expect(await maidCafe.decimals()).to.be.equal(18);
        });

        it("enter", async () => {
            const value0 = expandTo18Decimals(10);
            const value1 = expandTo18Decimals(6);

            await maidCoin.transfer(other.address, value0);

            expect(await maidCoin.balanceOf(other.address)).to.be.equal(value0);
            expect(await maidCafe.balanceOf(other.address)).to.be.equal(0);

            await maidCoin.connect(other).approve(maidCafe.address, value0.mul(1000000));
            await expect(maidCafe.connect(other).enter(value1))
                .to.emit(maidCafe, "Enter")
                .withArgs(other.address, value1);

            expect(await maidCoin.balanceOf(other.address)).to.be.equal(value0.sub(value1));
            expect(await maidCafe.balanceOf(other.address)).to.be.equal(value1);

            await maidCoin.mint(other.address, value0.mul(100));
            await maidCoin.mint(maidCafe.address, value1); //2 $MAID = 1 OMU
            expect(await maidCoin.balanceOf(maidCafe.address)).to.be.equal(value1.mul(2));

            await expect(() => maidCafe.connect(other).enter(value1)).to.changeTokenBalance(
                maidCafe,
                other,
                value1.div(2)
            );
            expect(await maidCafe.balanceOf(other.address)).to.be.equal(value1.mul(3).div(2));
        });

        it("burn", async () => {
            const value0 = expandTo18Decimals(10);
            const value1 = expandTo18Decimals(6);

            await maidCoin.mint(other.address, value0);
            await maidCoin.connect(other).approve(maidCafe.address, value0);
            await maidCafe.connect(other).enter(value0);

            expect(await maidCoin.balanceOf(other.address)).to.be.equal(0);
            expect(await maidCafe.balanceOf(other.address)).to.be.equal(value0);

            await expect(maidCafe.connect(other).leave(value1))
                .to.emit(maidCafe, "Leave")
                .withArgs(other.address, value1);

            expect(await maidCoin.balanceOf(other.address)).to.be.equal(value1);
            expect(await maidCafe.balanceOf(other.address)).to.be.equal(value0.sub(value1));

            await maidCoin.mint(maidCafe.address, value0.sub(value1));
            await expect(() => maidCafe.connect(other).leave(value0.sub(value1))).to.changeTokenBalance(
                maidCoin,
                other,
                value0.sub(value1).mul(2)
            );
        });

        it("data for permit", async () => {
            expect(await maidCoin.DOMAIN_SEPARATOR()).to.eq(
                keccak256(
                    defaultAbiCoder.encode(
                        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                        [
                            keccak256(
                                toUtf8Bytes(
                                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                                )
                            ),
                            keccak256(toUtf8Bytes("MaidCoin")),
                            keccak256(toUtf8Bytes("1")),
                            31337,
                            maidCoin.address,
                        ]
                    )
                )
            );
            expect(await maidCoin.PERMIT_TYPEHASH()).to.eq(
                keccak256(
                    toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
                )
            );
        });

        it("permit", async () => {
            const value = expandTo18Decimals(10);

            const nonce = await maidCoin.nonces(admin.address);
            const deadline = constants.MaxUint256;
            const digest = await getERC20ApprovalDigest(
                maidCoin,
                { owner: admin.address, spender: maidCafe.address, value },
                nonce,
                deadline
            );

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await expect(maidCafe.enterWithPermit(value, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(maidCafe, "Enter")
                .withArgs(admin.address, value);
            expect(await maidCoin.allowance(admin.address, maidCafe.address)).to.eq(0);
            expect(await maidCoin.nonces(admin.address)).to.eq(BigNumber.from(1));
        });
    });
});
