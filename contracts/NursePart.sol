// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./interfaces/INursePart.sol";

contract NursePart is
    Ownable,
    ERC1155("https://maidcoin.org/api/nursepart/{id}.json"),
    INursePart
{
    address public override nurseRaid = _msgSender();
    address public override cloneNurse = _msgSender();

    function changeNurseRaid(address addr) external onlyOwner {
        nurseRaid = addr;
    }

    function changeCloneNurse(address addr) external onlyOwner {
        cloneNurse = addr;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external override {
        require(msg.sender == nurseRaid);
        _mint(to, id, amount, "");
        emit Mint(to, id, amount);
    }

    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) external override {
        require(msg.sender == cloneNurse);
        _burn(from, id, amount);
        emit Burn(from, id, amount);
    }
}
