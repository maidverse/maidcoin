import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import NursePartArtifact from "../artifacts/contracts/NursePart.sol/NursePart.json";
import { NursePart } from "../typechain";
import { getERC1155ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("NursePart", () => {
    let nursePart: NursePart;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();

    beforeEach(async () => {
        nursePart = (await deployContract(admin, NursePartArtifact, [])) as NursePart;
    });

    context("new NursePart", async () => {
        it("name, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async () => {
            const name = await nursePart.name();
            expect(name).to.eq("MaidCoin Nurse Parts");
            expect(await nursePart.uri(0)).to.eq("https://api.maidcoin.org/nurseparts/{id}");
            expect(await nursePart.DOMAIN_SEPARATOR()).to.eq(
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
                            nursePart.address,
                        ]
                    )
                )
            );
            expect(await nursePart.PERMIT_TYPEHASH()).to.eq(
                keccak256(toUtf8Bytes("Permit(address owner,address spender,uint256 nonce,uint256 deadline)"))
            );
        });

        it("mint, balanceOf", async () => {
            const id = BigNumber.from(0);
            const amount = BigNumber.from(100);

            await expect(nursePart.mint(admin.address, id, amount))
                .to.emit(nursePart, "TransferSingle")
                .withArgs(admin.address, constants.AddressZero, admin.address, id, amount);
            expect(await nursePart.balanceOf(admin.address, id)).to.eq(amount);
        });

        it("burn, balanceOf", async () => {
            const id = BigNumber.from(0);
            const amount = BigNumber.from(100);
            const burn = BigNumber.from(25);

            await expect(nursePart.mint(admin.address, id, amount))
                .to.emit(nursePart, "TransferSingle")
                .withArgs(admin.address, constants.AddressZero, admin.address, id, amount);
            expect(await nursePart.balanceOf(admin.address, id)).to.eq(amount);

            await expect(nursePart.burn(id, burn))
                .to.emit(nursePart, "TransferSingle")
                .withArgs(admin.address, admin.address, constants.AddressZero, id, burn);
            expect(await nursePart.balanceOf(admin.address, id)).to.eq(amount.sub(burn));
        });

        it("permit", async () => {
            const id = BigNumber.from(0);
            const amount = BigNumber.from(100);

            await expect(nursePart.mint(admin.address, id, amount))
                .to.emit(nursePart, "TransferSingle")
                .withArgs(admin.address, constants.AddressZero, admin.address, id, amount);

            const nonce = await nursePart.nonces(admin.address);
            const deadline = constants.MaxUint256;
            const digest = await getERC1155ApprovalDigest(
                nursePart,
                { owner: admin.address, spender: other.address },
                nonce,
                deadline
            );

            const { v, r, s } = ecsign(
                Buffer.from(digest.slice(2), "hex"),
                Buffer.from(admin.privateKey.slice(2), "hex")
            );

            await expect(nursePart.permit(admin.address, other.address, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(nursePart, "ApprovalForAll")
                .withArgs(admin.address, other.address, true);
            expect(await nursePart.isApprovedForAll(admin.address, other.address)).to.eq(true);
            expect(await nursePart.nonces(admin.address)).to.eq(BigNumber.from(1));
        });
    });
});
