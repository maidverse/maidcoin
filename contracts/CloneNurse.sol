// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/ERC721.sol";
import "./interfaces/IERC1271.sol";
import "./interfaces/ICloneNurse.sol";

contract CloneNurse is Ownable, ERC721("CloneNurse", "CNURSE"), ICloneNurse {
    struct NurseType {
        uint256 partCount;
        uint256 destroyReturn;
        uint256 power;
    }
    struct Nurse {
        uint256 nurseType;
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
        address nursePartAddr,
        address maidCoinAddr,
        address theMasterAddr
    ) {
        nursePart = INursePart(nursePartAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        theMaster = ITheMaster(theMasterAddr);
    }

    function addNurseType(
        uint256 partCount,
        uint256 destroyReturn,
        uint256 power
    ) external onlyOwner returns (uint256 nurseType) {
        nurseType = nurseTypes.length;
        nurseTypes.push(NurseType({partCount: partCount, destroyReturn: destroyReturn, power: power}));
    }

    function assemble(uint256 nurserType) public override {
        NurseType memory nurseType = nurseTypes[nurserType];
        nursePart.safeTransferFrom(msg.sender, address(this), nurserType, nurseType.partCount, "");
        nursePart.burn(nurserType, nurseType.partCount);
        uint256 id = nurses.length;
        theMaster.deposit(2, nurseType.power, id);
        nurses.push(Nurse({nurseType: nurserType}));
        supportingRoute[id] = id;
        emit ChangeSupportingRoute(id, id);
        _mint(msg.sender, id);
    }

    function assembleWithPermit(
        uint256 nurserType,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        nursePart.permit(msg.sender, address(this), deadline, v, r, s);
        assemble(nurserType);
    }

    function destroy(uint256 id, uint256 toId) external override {
        require(toId != id);
        require(msg.sender == ownerOf(id));
        require(_exists(toId));

        NurseType memory nurseType = nurseTypes[nurses[id].nurseType];

        uint256 balanceBefore = maidCoin.balanceOf(address(this));
        theMaster.withdraw(2, nurseType.power, id);
        uint256 balanceAfter = maidCoin.balanceOf(address(this));
        uint256 reward = balanceAfter - balanceBefore;
        if (reward > 0) maidCoin.transfer(msg.sender, reward);

        supportingRoute[id] = toId;
        emit ChangeSupportingRoute(id, toId);
        uint256 power = supportedPower[id];
        supportedPower[toId] += power;
        supportedPower[id] = 0;
        emit ChangeSupportedPower(toId, int(power));
        // emit ChangeSupportedPower(id, -int(power));
        theMaster.mint(msg.sender, nurseType.destroyReturn);
        _burn(id);
    }

    function claim(uint256 id) external override {
        require(msg.sender == ownerOf(id));
        uint256 balanceBefore = maidCoin.balanceOf(address(this));
        theMaster.deposit(2, 0, id);
        uint256 balanceAfter = maidCoin.balanceOf(address(this));
        uint256 reward = balanceAfter - balanceBefore;
        if (reward > 0) maidCoin.transfer(msg.sender, reward);
        emit Claim(id, msg.sender, reward);
    }

    function pendingReward(uint256 id) external view override returns (uint256) {
        require(_exists(id));
        return theMaster.pendingReward(2, id);
    }

    function setSupportingTo(address supporter, uint256 to) public override {
        require(msg.sender == address(theMaster));
        supportingTo[supporter] = to;
        emit SupportTo(supporter, to);
    }

    function checkSupportingRoute(address supporter) public override returns (address, uint256) {
        require(msg.sender == address(theMaster));
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

    function changeSupportedPower(uint256 id, int256 power) public override {
        require(msg.sender == address(theMaster));
        int256 _supportedPower = int256(supportedPower[id]);
        if (power < 0) require(_supportedPower >= (-power));
        _supportedPower += power;
        supportedPower[id] = uint256(_supportedPower);
        emit ChangeSupportedPower(id, power);
    }

    function recordRewardsTransfer(
        address supporter,
        uint256 id,
        uint256 amounts
    ) public override {
        require(msg.sender == address(theMaster));
        totalRewardsFromSupporters[id] += amounts;
        emit TransferSupportingRewards(supporter, id, amounts);
    }
}
