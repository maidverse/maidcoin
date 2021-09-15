import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { hexlify } from "ethers/lib/utils";
import { waffle } from "hardhat";
import MaidsArtifact from "../../artifacts/contracts/Maids.sol/Maids.json";
import MaidCoinArtifact from "../../artifacts/contracts/MaidCoin.sol/MaidCoin.json";
import NursePartArtifact from "../../artifacts/contracts/NursePart.sol/NursePart.json";
import PermitTestArtifact from "../../artifacts/contracts/test/PermitTest.sol/PermitTest.json";
import TestLPTokenArtifact from "../../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json";
import { Maids, MaidCoin, NursePart, PermitTest, TestLPToken } from "../../typechain";
import { expandTo18Decimals } from "../shared/utils/number";
import { getERC1155ApprovalDigest, getERC20ApprovalDigest, getERC721ApprovalDigest } from "../shared/utils/standard";

const { deployContract } = waffle;

describe("PermitTest", () => {
    let testLPToken: TestLPToken;
    let maidCoin: MaidCoin;
    let maids: Maids;
    let nursePart: NursePart;
    let permitTest: PermitTest;

    const provider = waffle.provider;
    const [admin] = provider.getWallets();
    const testAmount = expandTo18Decimals(10);

    beforeEach(async () => {
        testLPToken = (await deployContract(admin, TestLPTokenArtifact, [])) as TestLPToken;

        maidCoin = (await deployContract(admin, MaidCoinArtifact, [])) as MaidCoin;

        maids = (await deployContract(admin, MaidsArtifact, [testLPToken.address])) as Maids;

        nursePart = (await deployContract(admin, NursePartArtifact, [])) as NursePart;

        permitTest = (await deployContract(admin, PermitTestArtifact, [
            maidCoin.address,
            maids.address,
            nursePart.address,
        ])) as PermitTest;
    });

    context("new PermitTest", async () => {
        it("maid coin permit", async () => {
            const nonce = await maidCoin.nonces(admin.address);
            const deadline = constants.MaxUint256;
            const digest = await getERC20ApprovalDigest(
                maidCoin,
                { owner: admin.address, spender: permitTest.address, value: testAmount },
                nonce,
                deadline
            );

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await permitTest.maidCoinPermitTest(testAmount, deadline, v, hexlify(r), hexlify(s));
            expect(await maidCoin.balanceOf(permitTest.address)).to.eq(testAmount);
        });

        it("maid permit", async () => {
            const id = BigNumber.from(0);

            await expect(maids.mint(BigNumber.from(12)))
                .to.emit(maids, "Transfer")
                .withArgs(constants.AddressZero, admin.address, id);

            const nonce = await maids.nonces(id);
            const deadline = constants.MaxUint256;
            const digest = await getERC721ApprovalDigest(maids, { spender: permitTest.address, id }, nonce, deadline);

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await permitTest.maidPermitTest(id, deadline, v, hexlify(r), hexlify(s));
            expect(await maids.ownerOf(id)).to.eq(permitTest.address);
        });

        it("nurse part permit", async () => {
            const id = BigNumber.from(0);
            const amount = BigNumber.from(100);

            await expect(nursePart.mint(admin.address, id, amount))
                .to.emit(nursePart, "TransferSingle")
                .withArgs(admin.address, constants.AddressZero, admin.address, id, amount);

            const nonce = await nursePart.nonces(admin.address);
            const deadline = constants.MaxUint256;
            const digest = await getERC1155ApprovalDigest(
                nursePart,
                { owner: admin.address, spender: permitTest.address },
                nonce,
                deadline
            );

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await permitTest.nursePartPermitTest(id, amount, deadline, v, hexlify(r), hexlify(s));
            expect(await nursePart.balanceOf(permitTest.address, id)).to.eq(amount);
        });
    });
});
