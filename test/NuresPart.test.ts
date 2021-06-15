import { expect } from 'chai'
import { deployContract, MockProvider } from 'ethereum-waffle'
import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import { ecsign } from 'ethereumjs-util';
import { expandTo18Decimals, getERC1155ApprovalDigest } from './shared/utilities'

const NURSE_PART = require('../artifacts/contracts/NursePart.sol/NursePart.json')

describe('NursePart', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999
    }
  })
  const [wallet, other] = provider.getWallets()
  
  let contract: Contract
  beforeEach(async () => {
    contract = await deployContract(wallet, NURSE_PART)
  })

  it('name, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const name = await contract.name()
    expect(name).to.eq('NursePart')
    expect(await contract.DOMAIN_SEPARATOR()).to.eq(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('1')),
            1,
            contract.address
          ]
        )
      )
    )
    expect(await contract.PERMIT_TYPEHASH()).to.eq(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 nonce,uint256 deadline)'))
    )
  })

  it('mint, balanceOf', async () => {

    const id = BigNumber.from(0);
    const amount = BigNumber.from(100);

    await expect(contract.mint(wallet.address, id, amount))
      .to.emit(contract, 'TransferSingle')
      .withArgs(wallet.address, ethers.constants.AddressZero, wallet.address, id, amount)
    expect(await contract.balanceOf(wallet.address, id)).to.eq(amount)
  })

  it('burn, balanceOf', async () => {

    const id = BigNumber.from(0);
    const amount = BigNumber.from(100);
    const burn = BigNumber.from(25);

    await expect(contract.mint(wallet.address, id, amount))
      .to.emit(contract, 'TransferSingle')
      .withArgs(wallet.address, ethers.constants.AddressZero, wallet.address, id, amount)
    expect(await contract.balanceOf(wallet.address, id)).to.eq(amount)

    await expect(contract.burn(id, burn))
      .to.emit(contract, 'TransferSingle')
      .withArgs(wallet.address, wallet.address, ethers.constants.AddressZero, id, burn)
    expect(await contract.balanceOf(wallet.address, id)).to.eq(amount.sub(burn))
  })

  it('permit', async () => {

    const id = BigNumber.from(0);
    const amount = BigNumber.from(100);

    await expect(contract.mint(wallet.address, id, amount))
      .to.emit(contract, 'TransferSingle')
      .withArgs(wallet.address, ethers.constants.AddressZero, wallet.address, id, amount)

    const nonce = await contract.nonces(wallet.address)
    const deadline = ethers.constants.MaxUint256
    const digest = await getERC1155ApprovalDigest(
      contract,
      { owner: wallet.address, spender: other.address },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await expect(contract.permit(wallet.address, other.address, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s)))
      .to.emit(contract, 'ApprovalForAll')
      .withArgs(wallet.address, other.address, true)
    expect(await contract.isApprovedForAll(wallet.address, other.address)).to.eq(true)
    expect(await contract.nonces(wallet.address)).to.eq(BigNumber.from(1))
  })
})