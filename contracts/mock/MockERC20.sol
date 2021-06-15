// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is Ownable, ERC20("Mock", "MOCK") {
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
