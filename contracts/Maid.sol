// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/ERC721.sol";
import "./uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IERC1271.sol";

contract Maid is Ownable, ERC721("Maid", "MAID") {
    event ChangeLPTokenToMaidPower(uint256 value);
    event Support(uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(uint256 indexed id, uint256 lpTokenAmount);

    struct MaidInfo {
        uint256 originPower;
        uint256 supportedLPTokenAmount;
    }

    bytes32 public immutable DOMAIN_SEPARATOR;
    // keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x49ecf333e5b8c95c40fdafc95c1ad136e8914a8fb55e9dc8bb01eaa83a2df9ad;
    // keccak256("Permit(address owner,address spender,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_ALL_TYPEHASH = 0xdaab21af31ece73a508939fedd476a5ee5129a5ed4bb091f3236ffb45394df62;
    mapping(uint256 => uint256) public nonces;
    mapping(address => uint256) public noncesForAll;

    IUniswapV2Pair public immutable lpToken;
    uint256 public lpTokenToMaidPower = 1;
    MaidInfo[] public maids;

    constructor(address lpTokenAddr) {
        lpToken = IUniswapV2Pair(lpTokenAddr);

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Maid")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
    }

    function changeLPTokenToMaidPower(uint256 value) external onlyOwner {
        lpTokenToMaidPower = value;
        emit ChangeLPTokenToMaidPower(value);
    }

    function mint(uint256 power) external onlyOwner returns (uint256 id) {
        id = maids.length;
        maids.push(MaidInfo({originPower: power, supportedLPTokenAmount: 0}));
        _mint(msg.sender, id);
    }

    function powerOf(uint256 id) external view returns (uint256) {
        MaidInfo memory maid = maids[id];
        return maid.originPower + (maid.supportedLPTokenAmount * lpTokenToMaidPower) / 1e18;
    }

    function support(uint256 id, uint256 lpTokenAmount) public {
        require(ownerOf(id) == msg.sender);
        maids[id].supportedLPTokenAmount += lpTokenAmount;

        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
        emit Support(id, lpTokenAmount);
    }

    function supportWithPermit(
        uint256 id,
        uint256 lpTokenAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        lpToken.permit(msg.sender, address(this), lpTokenAmount, deadline, v, r, s);
        support(id, lpTokenAmount);
    }

    function desupport(uint256 id, uint256 lpTokenAmount) external {
        require(ownerOf(id) == msg.sender);
        maids[id].supportedLPTokenAmount -= lpTokenAmount;
        lpToken.transfer(msg.sender, lpTokenAmount);

        emit Desupport(id, lpTokenAmount);
    }

    function permit(
        address spender,
        uint256 id,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, spender, id, nonces[id], deadline))
            )
        );
        nonces[id] += 1;

        address owner = ownerOf(id);
        require(spender != owner);

        if (Address.isContract(owner)) {
            require(IERC1271(owner).isValidSignature(digest, abi.encodePacked(r, s, v)) == 0x1626ba7e);
        } else {
            address recoveredAddress = ecrecover(digest, v, r, s);
            require(recoveredAddress != address(0));
            require(recoveredAddress == owner);
        }

        _approve(spender, id);
    }

    function permitAll(
        address owner,
        address spender,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_ALL_TYPEHASH, owner, spender, noncesForAll[owner], deadline))
            )
        );
        noncesForAll[owner] += 1;

        if (Address.isContract(owner)) {
            require(IERC1271(owner).isValidSignature(digest, abi.encodePacked(r, s, v)) == 0x1626ba7e);
        } else {
            address recoveredAddress = ecrecover(digest, v, r, s);
            require(recoveredAddress != address(0));
            require(recoveredAddress == owner);
        }

        _setApprovalForAll(owner, spender, true);
    }
}
