// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestLPToken is ERC20("TestLPToken", "TESTLP") {

	function mint(address to, uint amount) external {
		_mint(to, amount);
	}

    function burn(address from, uint amount) external {
        _burn(from, amount);
    }
}
