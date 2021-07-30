// SPDX-License-Identifier: MIT
pragma solidity =0.5.16;

import "../uniswapv2/UniswapV2ERC20.sol";

contract TestLPToken is UniswapV2ERC20("TestLPToken", "TESTLP") {
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
