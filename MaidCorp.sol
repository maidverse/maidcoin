// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidCorpInterface.sol";

contract MaidCorp is MaidCorpInterface {

    uint256 immutable public genesisBlock;

    constructor() {
        genesisBlock = block.number;
    }
}
