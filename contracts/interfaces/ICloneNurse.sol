// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./INursePart.sol";
import "./IMaidCoin.sol";
import "./ITheMaster.sol";

interface ICloneNurse is IERC721 {
    event Claim(uint256 indexed id, address indexed claimer, uint256 reward);
    event SupportTo(address indexed supporter, uint256 indexed to);
    event ChangeSupportingRoute(uint256 indexed from, uint256 indexed to);
    event ChangeSupportedPower(uint256 indexed id, int256 power);
    event TransferSupportingRewards(address indexed supporter, uint256 indexed id, uint256 amounts);

    function nursePart() external view returns (INursePart);

    function maidCoin() external view returns (IMaidCoin);

    function theMaster() external view returns (ITheMaster);

    function supportingRoute(uint256 id) external view returns (uint256);

    function supportingTo(address supporter) external view returns (uint256);

    function supportedPower(uint256 id) external view returns (uint256);

    function totalRewardsFromSupporters(uint256 id) external view returns (uint256);

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

    function setSupportingTo(address supporter, uint256 to) external;

    function checkSupportingRoute(address supporter) external returns (address, uint256);

    function changeSupportedPower(uint256 id, int256 power) external;

    function recordRewardsTransfer(
        address supporter,
        uint256 id,
        uint256 amounts
    ) external;
}
