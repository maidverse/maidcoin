// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./interfaces/INursePart.sol";

contract NursePart is Ownable, ERC1155("https://maidcoin.org/api/nursepart/{id}.json"), INursePart {
    
	address override public nurseRaid = _msgSender();
	address override public cloneNurse = _msgSender();
	
    function changeNurseRaid(address addr) onlyOwner external { nurseRaid = addr; }
    function changeCloneNurse(address addr) onlyOwner external { cloneNurse = addr; }
    
    function mint(address to, uint id, uint amount) override external {
        require(msg.sender == nurseRaid);
        _mint(to, id, amount, "");
        emit Mint(to, id, amount);
    }
    
    function burn(address from, uint id, uint amount) override external {
        require(msg.sender == cloneNurse);
        _burn(from, id, amount);
        emit Burn(from, id, amount);
    }
}
