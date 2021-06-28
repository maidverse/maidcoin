// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "./ISupportable.sol";
import "./INursePart.sol";
import "./IMaidCoin.sol";
import "./ITheMaster.sol";

interface ICloneNurse is IERC721, IERC721Metadata, IERC721Enumerable, ISupportable {

    event Claim(uint256 indexed id, address indexed claimer, uint256 reward);

    function nursePart() external view returns (INursePart);
    function maidCoin() external view returns (IMaidCoin);
    function theMaster() external view returns (ITheMaster);

    function nurseTypes(uint256 typeId)
        external
        view
        returns (
            uint256 partCount,
            uint256 destroyReturn,
            uint256 power
        );

    function nurses(uint256 id) external view returns (uint256 nurseType);

    function assemble(uint256 nurserType) external;

    function assembleWithPermit(
        uint256 nurserType,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function destroy(uint256 id, uint256 toId) external;

    function claim(uint256 id) external;

    function pendingReward(uint256 id) external view returns (uint256);
}
