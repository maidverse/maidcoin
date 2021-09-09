// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./libraries/ERC721.sol";
import "./libraries/ERC721Enumerable.sol";
import "./interfaces/IERC1271.sol";
import "./interfaces/ICloneNurses.sol";

contract CloneNurses is
    Ownable,
    ERC721("MaidCoin Clone Nurses", "CNURSES"),
    ERC721Enumerable,
    ERC1155Holder,
    ICloneNurses
{
    struct NurseType {
        uint256 partCount;
        uint256 destroyReturn;
        uint256 power;
        uint256 lifetime;
    }

    struct Nurse {
        uint256 nurseType;
        uint256 endBlock;
        uint256 lastClaimedBlock;
    }

    INursePart public immutable override nursePart;
    IMaidCoin public immutable override maidCoin;
    ITheMaster public immutable override theMaster;

    mapping(uint256 => uint256) public override supportingRoute;
    mapping(address => uint256) public override supportingTo;
    mapping(uint256 => uint256) public override supportedPower;
    mapping(uint256 => uint256) public override totalRewardsFromSupporters;

    NurseType[] public override nurseTypes;
    Nurse[] public override nurses;

    constructor(
        INursePart _nursePart,
        IMaidCoin _maidCoin,
        ITheMaster _theMaster
    ) {
        nursePart = _nursePart;
        maidCoin = _maidCoin;
        theMaster = _theMaster;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://api.maidcoin.org/clonenurses/";
    }

    function addNurseType(
        uint256 partCount,
        uint256 destroyReturn,
        uint256 power,
        uint256 lifetime
    ) external onlyOwner returns (uint256 nurseType) {
        nurseType = nurseTypes.length;
        nurseTypes.push(
            NurseType({partCount: partCount, destroyReturn: destroyReturn, power: power, lifetime: lifetime})
        );
    }

    function nurseTypeCount() external view override returns (uint256) {
        return nurseTypes.length;
    }

    function assemble(uint256 _nurseType, uint256 _parts) public override {
        NurseType storage nurseType = nurseTypes[_nurseType];
        uint256 _partCount = nurseType.partCount;
        require(_parts >= _partCount, "CloneNurses: Not enough parts");

        nursePart.safeTransferFrom(msg.sender, address(this), _nurseType, _parts, "");
        nursePart.burn(_nurseType, _parts);
        uint256 endBlock = block.number + ((nurseType.lifetime * (_parts - 1)) / (_partCount - 1));
        uint256 id = nurses.length;
        theMaster.deposit(2, nurseType.power, id);
        nurses.push(Nurse({nurseType: _nurseType, endBlock: endBlock, lastClaimedBlock: block.number}));
        supportingRoute[id] = id;
        emit ChangeSupportingRoute(id, id);
        _mint(msg.sender, id);
    }

    function assembleWithPermit(
        uint256 nurseType,
        uint256 _parts,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        nursePart.permit(msg.sender, address(this), deadline, v, r, s);
        assemble(nurseType, _parts);
    }

    function elongateLifetime(uint256 id, uint256 parts) external override {
        require(parts > 0, "CloneNurses: Invalid amounts of parts");
        Nurse storage nurse = nurses[id];
        uint256 _nurseType = nurse.nurseType;
        NurseType storage nurseType = nurseTypes[_nurseType];

        claim(id);
        nursePart.safeTransferFrom(msg.sender, address(this), _nurseType, parts, "");
        nursePart.burn(_nurseType, parts);

        uint256 oldEndBlock = nurse.endBlock;
        uint256 from;
        if (block.number <= oldEndBlock) from = oldEndBlock;
        else from = block.number;

        uint256 newEndBlock = from + ((nurseType.lifetime * parts) / (nurseType.partCount - 1));
        nurse.endBlock = newEndBlock;
    }

    function destroy(uint256 id, uint256 toId) external override {
        require(toId != id, "CloneNurses: Invalid id, toId");
        require(msg.sender == ownerOf(id), "CloneNurses: Forbidden");
        require(_exists(toId), "CloneNurses: Invalid toId");

        NurseType storage nurseType = nurseTypes[nurses[id].nurseType];

        uint256 balanceBefore = maidCoin.balanceOf(address(this));
        theMaster.withdraw(2, nurseType.power, id);
        uint256 balanceAfter = maidCoin.balanceOf(address(this));
        uint256 reward = balanceAfter - balanceBefore;
        _claim(id, reward);

        supportingRoute[id] = toId;
        emit ChangeSupportingRoute(id, toId);
        uint256 power = supportedPower[id];
        supportedPower[toId] += power;
        supportedPower[id] = 0;
        emit ChangeSupportedPower(toId, int256(power));
        theMaster.mint(msg.sender, nurseType.destroyReturn);
        _burn(id);
    }

    function claim(uint256 id) public override {
        require(msg.sender == ownerOf(id), "CloneNurses: Forbidden");
        uint256 balanceBefore = maidCoin.balanceOf(address(this));
        theMaster.deposit(2, 0, id);
        uint256 balanceAfter = maidCoin.balanceOf(address(this));
        uint256 reward = balanceAfter - balanceBefore;
        _claim(id, reward);
    }

    function _claim(uint256 id, uint256 reward) internal {
        if (reward == 0) return;
        else {
            Nurse storage nurse = nurses[id];
            uint256 endBlock = nurse.endBlock;
            uint256 lastClaimedBlock = nurse.lastClaimedBlock;
            uint256 burningReward;
            uint256 claimableReward;
            if (endBlock <= lastClaimedBlock) burningReward = reward;
            else if (endBlock < block.number) {
                claimableReward = (reward * (endBlock - lastClaimedBlock)) / (block.number - endBlock);
                burningReward = reward - claimableReward;
            } else claimableReward = reward;

            if (burningReward > 0) maidCoin.burn(burningReward);
            if (claimableReward > 0) maidCoin.transfer(msg.sender, claimableReward);
            nurse.lastClaimedBlock = block.number;
            emit Claim(id, msg.sender, claimableReward);
        }
    }

    function pendingReward(uint256 id) external view override returns (uint256 claimableReward) {
        require(_exists(id), "CloneNurses: Invalid id");
        uint256 reward = theMaster.pendingReward(2, id);

        if (reward == 0) return 0;
        else {
            Nurse storage nurse = nurses[id];
            uint256 endBlock = nurse.endBlock;
            uint256 lastClaimedBlock = nurse.lastClaimedBlock;
            if (endBlock <= lastClaimedBlock) return 0;
            else if (endBlock < block.number) {
                claimableReward = (reward * (endBlock - lastClaimedBlock)) / (block.number - endBlock);
            } else claimableReward = reward;
        }
    }

    function setSupportingTo(
        address supporter,
        uint256 to,
        uint256 amounts
    ) public override {
        require(msg.sender == address(theMaster), "CloneNurses: Forbidden");
        require(_exists(to), "CloneNurses: Invalid target");
        supportingTo[supporter] = to;
        emit SupportTo(supporter, to);

        if (amounts > 0) {
            supportedPower[to] += amounts;
            emit ChangeSupportedPower(to, int256(amounts));
        }
    }

    function checkSupportingRoute(address supporter) public override returns (address, uint256) {
        uint256 _supportingTo = supportingTo[supporter];
        uint256 _route = supportingRoute[_supportingTo];
        if (_route == _supportingTo) return (ownerOf(_supportingTo), _supportingTo);
        uint256 initialSupportTo = _supportingTo;
        while (_route != _supportingTo) {
            _supportingTo = _route;
            _route = supportingRoute[_supportingTo];
        }
        supportingTo[supporter] = _supportingTo;
        supportingRoute[initialSupportTo] = _supportingTo;
        emit ChangeSupportingRoute(initialSupportTo, _supportingTo);
        emit SupportTo(supporter, _supportingTo);
        return (ownerOf(_supportingTo), _supportingTo);
    }

    function changeSupportedPower(address supporter, int256 power) public override {
        require(msg.sender == address(theMaster), "CloneNurses: Forbidden");
        (, uint256 id) = checkSupportingRoute(supporter);
        int256 _supportedPower = int256(supportedPower[id]);
        if (power < 0) require(_supportedPower >= (-power), "CloneNurses: Outranged power");
        _supportedPower += power;
        supportedPower[id] = uint256(_supportedPower);
        emit ChangeSupportedPower(id, power);
    }

    function recordRewardsTransfer(
        address supporter,
        uint256 id,
        uint256 amounts
    ) internal {
        totalRewardsFromSupporters[id] += amounts;
        emit TransferSupportingRewards(supporter, id, amounts);
    }

    function shareRewards(
        uint256 pending,
        address supporter,
        uint8 supportingRatio
    ) public override returns (address nurseOwner, uint256 amountToNurseOwner) {
        require(msg.sender == address(theMaster), "CloneNurses: Forbidden");
        amountToNurseOwner = (pending * supportingRatio) / 100;
        uint256 _supportTo;
        if (amountToNurseOwner > 0) {
            (nurseOwner, _supportTo) = checkSupportingRoute(supporter);
            recordRewardsTransfer(supporter, _supportTo, amountToNurseOwner);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC721, ERC1155Receiver, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
