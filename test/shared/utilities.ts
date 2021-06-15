import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'

const ERC20_PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

const ERC721_PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)')
)

const ERC1155_PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 nonce,uint256 deadline)')
)

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

function getDomainSeparator(name: string, tokenAddress: string) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('1')),
        1,
        tokenAddress
      ]
    )
  )
}

export async function getERC20ApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
    value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [ERC20_PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        )
      ]
    )
  )
}

export async function getERC721ApprovalDigest(
  token: Contract,
  approve: {
    spender: string
    id: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'uint256', 'uint256', 'uint256'],
            [ERC721_PERMIT_TYPEHASH, approve.spender, approve.id, nonce, deadline]
          )
        )
      ]
    )
  )
}

export async function getERC1155ApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256'],
            [ERC1155_PERMIT_TYPEHASH, approve.owner, approve.spender, nonce, deadline]
          )
        )
      ]
    )
  )
}