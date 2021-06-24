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

    mapping(uint256 => uint256) public override supportRoute;
    mapping(address => uint256) public override supportTo;
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
        supportRoute[id] = id;
        emit SupportRoute(id, id);
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

        supportRoute[id] = toId;
        emit SupportRoute(id, toId);
        uint256 power = supportedPower[id];
        supportedPower[toId] += power;
        supportedPower[id] = 0;
        emit SupportPowerChanged(toId, int(power));
        // emit SupportPowerChanged(id, -int(power));
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

    function setSupportTo(address supporter, uint256 to) public override {
        require(msg.sender == address(theMaster));
        supportTo[supporter] = to;
        emit SupportRecorded(supporter, to);
    }

    function checkSupportRoute(address supporter) public override returns (address, uint256) {
        require(msg.sender == address(theMaster));
        uint256 _supportTo = supportTo[supporter];
        uint256 _route = supportRoute[_supportTo];
        if (_route == _supportTo) return (ownerOf(_supportTo), _supportTo);
        uint256 initialSupportTo = _supportTo;
        while (_route != _supportTo) {
            _supportTo = _route;
            _route = supportRoute[_supportTo];
        }
        supportTo[supporter] = _supportTo;
        supportRoute[initialSupportTo] = _supportTo;
        emit SupportRoute(initialSupportTo, _supportTo);
        emit SupportRecorded(supporter, _supportTo);
        return (ownerOf(_supportTo), _supportTo);
    }

    function changeSupportedPower(uint256 id, int256 power) public override {
        require(msg.sender == address(theMaster));
        int256 _supportedPower = int256(supportedPower[id]);
        if (power < 0) require(_supportedPower >= (-power));
        _supportedPower += power;
        supportedPower[id] = uint256(_supportedPower);
        emit SupportPowerChanged(id, power);
    }

    function recordRewardsTransfer(
        address supporter,
        uint256 id,
        uint256 amounts
    ) public override {
        require(msg.sender == address(theMaster));
        totalRewardsFromSupporters[id] += amounts;
        emit SupportingRewardsTransfer(supporter, id, amounts);
    }
}
