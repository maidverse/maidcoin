// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidCorpInterface.sol";

contract MaidCorp is MaidCorpInterface {
	
    uint8   constant public DECIMALS = 8;
    uint256 constant public COIN = 10 ** uint256(DECIMALS);
    uint256 constant public COIN_PER_BLOCK = 10;

    uint256 immutable public startBlock;

    constructor() {
        startBlock = block.number;
    }
}
