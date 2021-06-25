import { expect } from 'chai'
import { deployContract, MockProvider } from 'ethereum-waffle'
import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import { ecsign } from 'ethereumjs-util';
import { expandTo18Decimals, getERC1155ApprovalDigest, getERC20ApprovalDigest, getERC721ApprovalDigest } from './shared/utilities'

const TEST_LP_TOKEN = require('../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json')
const MAID_COIN = require('../artifacts/contracts/MaidCoin.sol/MaidCoin.json')
const MAID = require('../artifacts/contracts/Maid.sol/Maid.json')
const NURSE_PART = require('../artifacts/contracts/NursePart.sol/NursePart.json')
const PERMIT_TEST = require('../artifacts/contracts/test/PermitTest.sol/PermitTest.json')

const TEST_AMOUNT = expandTo18Decimals(10)

describe('PermitTest', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999
    }
  })
  const [wallet, other] = provider.getWallets()
  
  let testLPToken1: Contract
  let maidCoin: Contract;
  let maid: Contract;
  let nursePart: Contract;
  let contract: Contract
  beforeEach(async () => {
    testLPToken1 = await deployContract(wallet, TEST_LP_TOKEN)
    maidCoin = await deployContract(wallet, MAID_COIN)
    maid = await deployContract(wallet, MAID, [testLPToken1.address])
    nursePart = await deployContract(wallet, NURSE_PART)
    contract = await deployContract(wallet, PERMIT_TEST, [maidCoin.address, maid.address, nursePart.address])
  })

  it('maid coin permit', async () => {
    const nonce = await maidCoin.nonces(wallet.address)
    const deadline = ethers.constants.MaxUint256
    const digest = await getERC20ApprovalDigest(
      maidCoin,
      { owner: wallet.address, spender: contract.address, value: TEST_AMOUNT },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await contract.maidCoinPermitTest(TEST_AMOUNT, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s))
    expect(await maidCoin.balanceOf(contract.address)).to.eq(TEST_AMOUNT)
  })

  it('maid permit', async () => {

    const id = BigNumber.from(0);

    await expect(maid.mint(BigNumber.from(12)))
      .to.emit(maid, 'Transfer')
      .withArgs(ethers.constants.AddressZero, wallet.address, id)

    const nonce = await maid.nonces(id)
    const deadline = ethers.constants.MaxUint256
    const digest = await getERC721ApprovalDigest(
      maid,
      { spender: contract.address, id },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await contract.maidPermitTest(id, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s))
    expect(await maid.ownerOf(id)).to.eq(contract.address)
  })

  it('nurse part permit', async () => {

    const id = BigNumber.from(0);
    const amount = BigNumber.from(100);

    await expect(nursePart.mint(wallet.address, id, amount))
      .to.emit(nursePart, 'TransferSingle')
      .withArgs(wallet.address, ethers.constants.AddressZero, wallet.address, id, amount)

    const nonce = await nursePart.nonces(wallet.address)
    const deadline = ethers.constants.MaxUint256
    const digest = await getERC1155ApprovalDigest(
      nursePart,
      { owner: wallet.address, spender: contract.address },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await contract.nursePartPermitTest(id, amount, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s))
    expect(await nursePart.balanceOf(contract.address, id)).to.eq(amount)
  })
})