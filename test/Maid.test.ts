import { expect } from 'chai'
import { deployContract, MockProvider } from 'ethereum-waffle'
import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import { ecsign } from 'ethereumjs-util';
import { expandTo18Decimals, getERC721ApprovalDigest } from './shared/utilities'

const TEST_LP_TOKEN = require('../artifacts/contracts/test/TestLPToken.sol/TestLPToken.json')
const MAID = require('../artifacts/contracts/Maid.sol/Maid.json')

describe('Maid', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999
    }
  })
  const [wallet, other] = provider.getWallets()
  
  let testLPToken1: Contract
  let testLPToken2: Contract
  let contract: Contract
  beforeEach(async () => {
    testLPToken1 = await deployContract(wallet, TEST_LP_TOKEN)
    testLPToken2 = await deployContract(wallet, TEST_LP_TOKEN)
    contract = await deployContract(wallet, MAID, [testLPToken1.address])
  })

  it('name, symbol, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const name = await contract.name()
    expect(name).to.eq('Maid')
    expect(await contract.symbol()).to.eq('MAID')
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
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)'))
    )
  })

  it('changeLPToken', async () => {
    expect(await contract.lpToken()).to.eq(testLPToken1.address)
    await expect(contract.changeLPToken(testLPToken2.address))
      .to.emit(contract, 'ChangeLPToken')
      .withArgs(testLPToken2.address)
    expect(await contract.lpToken()).to.eq(testLPToken2.address)
  })

  it('changeLPTokenToMaidPower', async () => {
    expect(await contract.lpTokenToMaidPower()).to.eq(BigNumber.from(1))
    await expect(contract.changeLPTokenToMaidPower(BigNumber.from(2)))
      .to.emit(contract, 'ChangeLPTokenToMaidPower')
      .withArgs(BigNumber.from(2))
    expect(await contract.lpTokenToMaidPower()).to.eq(BigNumber.from(2))
  })

  it('mint, powerOf', async () => {
    
    const id = BigNumber.from(0);
    const power = BigNumber.from(12);

    await expect(contract.mint(power))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, wallet.address, id)
    expect(await contract.powerOf(id)).to.eq(power)
  })

  it('support, powerOf', async () => {
    
    const id = BigNumber.from(0);
    const power = BigNumber.from(12);
    const token = BigNumber.from(100);

    await testLPToken1.mint(wallet.address, token);
    await testLPToken1.approve(contract.address, token);

    await expect(contract.mint(power))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, wallet.address, id)
    await expect(contract.support(id, token))
      .to.emit(contract, 'Support')
      .withArgs(id, token)
    expect(await contract.powerOf(id)).to.eq(power.add(token.mul(await contract.lpTokenToMaidPower()).div(expandTo18Decimals(1))))
  })

  it('desupport, powerOf', async () => {
    
    const id = BigNumber.from(0);
    const power = BigNumber.from(12);
    const token = BigNumber.from(100);

    await testLPToken1.mint(wallet.address, token);
    await testLPToken1.approve(contract.address, token);

    await expect(contract.mint(power))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, wallet.address, id)
    await expect(contract.support(id, token))
      .to.emit(contract, 'Support')
      .withArgs(id, token)
    expect(await contract.powerOf(id)).to.eq(power.add(token.mul(await contract.lpTokenToMaidPower()).div(expandTo18Decimals(1))))
    await expect(contract.desupport(id, token))
      .to.emit(contract, 'Desupport')
      .withArgs(id, token)
    expect(await contract.powerOf(id)).to.eq(power)
  })

  it('permit', async () => {

    const id = BigNumber.from(0);

    await expect(contract.mint(BigNumber.from(12)))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, wallet.address, id)

    const nonce = await contract.nonces(id)
    const deadline = ethers.constants.MaxUint256
    const digest = await getERC721ApprovalDigest(
      contract,
      { spender: other.address, id },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await expect(contract.permit(other.address, id, deadline, v, ethers.utils.hexlify(r), ethers.utils.hexlify(s)))
      .to.emit(contract, 'Approval')
      .withArgs(wallet.address, other.address, id)
    expect(await contract.getApproved(id)).to.eq(other.address)
    expect(await contract.nonces(id)).to.eq(BigNumber.from(1))
  })
})