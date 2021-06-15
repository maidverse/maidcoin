// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/ICloneNurse.sol";
import "./interfaces/ITheMaster.sol";

contract CloneNurse is Ownable, ERC721("CloneNurse", "CNURSE"), ICloneNurse {
    struct NurseType {
        uint256 partCount;
        uint256 destroyReturn;
        uint256 power;
    }
    struct Nurse {
        uint256 nurseType;
        uint256 supportPower;
        uint256 masterAccReward;
        uint256 supporterAccReward;
        bool supportable;
    }
    struct Supporter {
        address addr;
        uint256 lpTokenAmount;
        uint256 accReward;
    }

    INursePart public override nursePart;
    IMaidCoin public override maidCoin;
    ITheMaster public override theMaster;
    IERC20 public override lpToken;

    uint256 public override lpTokenToNursePower = 1;

    NurseType[] public override nurseTypes;
    Nurse[] public override nurses;

    mapping(uint256 => Supporter[]) public supporters;
    mapping(uint256 => mapping(address => uint256)) public addrToSupporter;

    uint256 private lastUpdateBlock;
    uint256 private _accRewardPerShare;
    uint256 private totalPower = 0;

    constructor(
        address nursePartAddr,
        address maidCoinAddr,
        address theMasterAddr,
        address lpTokenAddr
    ) {
        nursePart = INursePart(nursePartAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        theMaster = ITheMaster(theMasterAddr);
        lpToken = IERC20(lpTokenAddr);
    }

    function changeLPTokenToNursePower(uint256 value) external onlyOwner {
        lpTokenToNursePower = value;
        emit ChangeLPTokenToNursePower(value);
    }

    function addNurseType(
        uint256 partCount,
        uint256 destroyReturn,
        uint256 power
    ) external onlyOwner returns (uint256 typeId) {
        typeId = nurseTypes.length;
        nurseTypes.push(NurseType({partCount: partCount, destroyReturn: destroyReturn, power: power}));
    }

    function originPower(uint256 typeId) internal view returns (uint256) {
        return nurseTypes[typeId].power;
    }

    function assemble(uint256 ntype, bool supportable) external override returns (uint256 id) {
        NurseType memory nurseType = nurseTypes[ntype];

        nursePart.burn(ntype, nurseType.partCount);

        uint256 power = originPower(ntype);
        totalPower += power;

        uint256 masterAccReward = (_update() * power) / 1e18;
        nurses.push(
            Nurse({
                nurseType: ntype,
                supportPower: 0,
                masterAccReward: masterAccReward,
                supporterAccReward: 0,
                supportable: supportable
            })
        );

        id = nurses.length;
        theMaster.deposit(1, masterAccReward, id);
        if (id < theMaster.WINNING_BONUS_TAKERS()) {
            theMaster.claimWinningBonus(id);
        }
        _mint(msg.sender, id);
    }

    function changeSupportable(uint256 id, bool supportable) external override {
        require(msg.sender == ownerOf(id));
        nurses[id].supportable = supportable;
    }

    function moveSupporters(
        uint256 from,
        uint256 to,
        uint256 number
    ) public override {
        require(msg.sender == ownerOf(from) && from != to);

        claim(from);
        claim(to);

        Supporter[] storage fromSup = supporters[from];
        Supporter[] storage toSup = supporters[to];

        mapping(address => uint256) storage fromAddrToSup = addrToSupporter[from];
        mapping(address => uint256) storage toAddrToSup = addrToSupporter[to];

        uint256 totalLPTokenAmount = 0;

        require(fromSup.length <= number);
        for (uint256 i = number - 1; i > 0; i -= 1) {
            Supporter memory supporter = fromSup[i];

            delete fromAddrToSup[supporter.addr];
            toAddrToSup[supporter.addr] = toSup.length;

            toSup.push(supporter);
            fromSup.pop();

            totalLPTokenAmount += supporter.lpTokenAmount;
        }

        uint256 supportPower = (totalLPTokenAmount * lpTokenToNursePower) / 1e18;

        nurses[from].supportPower -= supportPower;
        nurses[to].supportPower += supportPower;
    }

    function destroy(uint256 id, uint256 supportersTo) external override {
        require(msg.sender == ownerOf(id) && supportersTo != id);

        // need to move supporters to another nurse
        moveSupporters(id, supportersTo, supporters[id].length);

        (uint256 amount, ) = theMaster.userInfo(1, id);
        theMaster.withdraw(1, amount, id);

        totalPower -= originPower(id);
        _burn(id);
    }

    function support(uint256 id, uint256 lpTokenAmount) external override {
        claim(id);

        uint256 supporterId = addrToSupporter[id][msg.sender];

        Supporter[] storage sups = supporters[id];

        if (sups[supporterId].addr != msg.sender) {
            // new supporter

            supporterId = sups.length;

            sups.push(Supporter({addr: msg.sender, lpTokenAmount: lpTokenAmount, accReward: 0}));

            addrToSupporter[id][msg.sender] = supporterId;
        } else {
            // add amount
            supporters[id][supporterId].lpTokenAmount += lpTokenAmount;
        }

        uint256 supportPower = (lpTokenAmount * lpTokenToNursePower) / 1e18;
        nurses[id].supportPower += supportPower;
        totalPower += supportPower;

        // need approve
        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);

        emit Support(msg.sender, id, lpTokenAmount);
    }

    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        claim(id);

        uint256 supporterId = addrToSupporter[id][msg.sender];

        Supporter storage supporter = supporters[id][supporterId];

        require(supporter.addr == msg.sender);

        supporter.lpTokenAmount -= lpTokenAmount;

        if (supporter.lpTokenAmount == 0) {
            delete supporters[id][supporterId];
            delete addrToSupporter[id][msg.sender];
        }

        uint256 supportPower = (lpTokenAmount * lpTokenToNursePower) / 1e18;
        nurses[id].supportPower -= supportPower;
        totalPower -= supportPower;

        lpToken.transfer(msg.sender, lpTokenAmount);

        emit Desupport(msg.sender, id, lpTokenAmount);
    }

    function _update() internal returns (uint256 result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            (, , , , uint256 accRewardPerShare, ) = theMaster.poolInfo(1);
            _accRewardPerShare = accRewardPerShare;
            lastUpdateBlock = block.number;
        }
    }

    function claimAmountOf(uint256 id) external view override returns (uint256) {
        address master = ownerOf(id);
        if (master == address(0)) {
            return 0;
        }

        Nurse memory nurse = nurses[id];

        uint256 _originPower = originPower(nurse.nurseType);
        uint256 power = _originPower + nurse.supportPower;
        (, , , , uint256 accRewardPerShare, ) = theMaster.poolInfo(1);
        uint256 acc = (accRewardPerShare * power) / 1e18;
        uint256 totalReward = 0;

        // owner
        if (master == msg.sender) {
            totalReward += (acc * _originPower) / power - nurse.masterAccReward;
        }

        // supporter
        uint256 supporterId = addrToSupporter[id][msg.sender];
        if (supporterId != 0) {
            uint256 supporterAccReward = (acc * nurse.supportPower) / power - nurse.supporterAccReward;
            Supporter memory supporter = supporters[id][supporterId];
            totalReward +=
                (supporterAccReward * supporter.lpTokenAmount * lpTokenToNursePower) /
                1e18 /
                nurse.supportPower -
                supporter.accReward;
        }

        return totalReward;
    }

    function claim(uint256 id) public override {
        address master = ownerOf(id);
        require(master != address(0));

        Nurse storage nurse = nurses[id];
        require(master != address(0));

        uint256 _originPower = originPower(nurse.nurseType);
        uint256 power = _originPower + nurse.supportPower;
        uint256 acc = (_update() * power) / 1e18;
        uint256 totalReward = 0;

        uint256 masterAccReward = (acc * _originPower) / power - nurse.masterAccReward;
        nurse.masterAccReward += masterAccReward;

        uint256 supporterAccReward = (acc * nurse.supportPower) / power - nurse.supporterAccReward;
        nurse.supporterAccReward += supporterAccReward;

        // owner
        if (master == msg.sender) {
            totalReward += masterAccReward;
        } else {
            maidCoin.transfer(master, masterAccReward);
        }

        // supporter
        uint256 supporterId = addrToSupporter[id][msg.sender];
        if (supporterId != 0) {
            Supporter storage supporter = supporters[id][supporterId];
            uint256 reward = (supporterAccReward * supporter.lpTokenAmount * lpTokenToNursePower) /
                1e18 /
                nurse.supportPower -
                supporter.accReward;
            totalReward += reward;
            supporter.accReward += reward;
        }

        maidCoin.transfer(msg.sender, totalReward);
    }
}
