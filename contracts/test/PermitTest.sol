// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "../interfaces/IMaidCoin.sol";
import "../interfaces/IMaids.sol";
import "../interfaces/INursePart.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract PermitTest is IERC1155Receiver, ERC165 {
    IMaidCoin private maidCoin;
    IMaids private maids;
    INursePart private nursePart;

    constructor(
        IMaidCoin _maidCoin,
        IMaids _maids,
        INursePart _nursePart
    ) {
        maidCoin = _maidCoin;
        maids = _maids;
        nursePart = _nursePart;
    }

    function maidCoinPermitTest(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        maidCoin.permit(msg.sender, address(this), amount, deadline, v, r, s);
        maidCoin.transferFrom(msg.sender, address(this), amount);
    }

    function maidPermitTest(
        uint256 id,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        maids.permit(address(this), id, deadline, v, r, s);
        maids.transferFrom(msg.sender, address(this), id);
    }

    function nursePartPermitTest(
        uint256 id,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        nursePart.permit(msg.sender, address(this), deadline, v, r, s);
        nursePart.safeTransferFrom(msg.sender, address(this), id, amount, "");
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC1155).interfaceId || super.supportsInterface(interfaceId);
    }
}
