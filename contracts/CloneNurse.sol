// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/ICloneNurse.sol";
import "./interfaces/INursePart.sol";

contract CloneNurse is Ownable, ERC721("CloneNurse", "CNURSE"), ICloneNurse {
    IRatio public override ratio;
    INursePart public override nursePart;
    IMaidCoin public override maidCoin;
    IERC20 public override lpToken;

    constructor(
        address ratioAddr,
        address nursePartAddr,
        address maidCoinAddr,
        address lpTokenAddr
    ) {
        ratio = IRatio(ratioAddr);
        nursePart = INursePart(nursePartAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        lpToken = IERC20(lpTokenAddr);
    }

    function changeLPToken(address addr) external onlyOwner {
        lpToken = IERC20(addr);
    }

    struct NurseType {
        uint256 partCount;
        uint256 destroyReturn;
        uint256 power;
    }
    NurseType[] public nurseTypes;

    function addNurseClass(
        uint256 partCount,
        uint256 destroyReturn,
        uint256 power
    ) external onlyOwner returns (uint256 nurseType) {
        nurseType = nurseTypes.length;
        nurseTypes.push(
            NurseType({
                partCount: partCount,
                destroyReturn: destroyReturn,
                power: power
            })
        );
    }

    function originPower(uint256 nurseType) internal view returns (uint256) {
        return nurseTypes[nurseType].power;
    }

    uint256 private lastUpdateBlock;
    uint256 private _accRewardPerShare;
    uint256 private totalPower = 0;

    struct Nurse {
        uint256 nurseType;
        uint256 supportPower;
        uint256 masterAccReward;
        uint256 supporterAccReward;
        bool supportable;
    }
    Nurse[] public nurses;

    struct Supporter {
        address addr;
        uint256 lpTokenAmount;
        uint256 accReward;
    }
    mapping(uint256 => Supporter[]) public supporters;
    mapping(uint256 => mapping(address => uint256)) public addrToSupporter;

    function assemble(uint256 ntype, bool supportable)
        external
        override
        returns (uint256 id)
    {
        NurseType memory nurseType = nurseTypes[ntype];

        nursePart.burn(msg.sender, ntype, nurseType.partCount);

        uint256 power = originPower(ntype);

        id = nurses.length;

        nurses.push(
            Nurse({
                nurseType: ntype,
                supportPower: 0,
                masterAccReward: (_update() * power) / 1e18,
                supporterAccReward: 0,
                supportable: supportable
            })
        );

        totalPower += power;

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

        mapping(address => uint256) storage fromAddrToSup = addrToSupporter[
            from
        ];
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

        uint256 supportPower = (totalLPTokenAmount *
            ratio.lpTokenToNursePower()) / ratio.precision();

        nurses[from].supportPower -= supportPower;
        nurses[to].supportPower += supportPower;
    }

    function destroy(uint256 id, uint256 supportersTo) external override {
        require(msg.sender == ownerOf(id) && supportersTo != id);

        // need to move supporters to another nurse
        moveSupporters(id, supportersTo, supporters[id].length);

        maidCoin.mintForCloneNurseDestruction(
            msg.sender,
            nurseTypes[nurses[id].nurseType].destroyReturn
        );

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

            sups.push(
                Supporter({
                    addr: msg.sender,
                    lpTokenAmount: lpTokenAmount,
                    accReward: 0
                })
            );

            addrToSupporter[id][msg.sender] = supporterId;
        } else {
            // add amount
            supporters[id][supporterId].lpTokenAmount += lpTokenAmount;
        }

        uint256 supportPower = (lpTokenAmount * ratio.lpTokenToNursePower()) /
            ratio.precision();
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

        uint256 supportPower = (lpTokenAmount * ratio.lpTokenToNursePower()) /
            ratio.precision();
        nurses[id].supportPower -= supportPower;
        totalPower -= supportPower;

        lpToken.transfer(msg.sender, lpTokenAmount);

        emit Desupport(msg.sender, id, lpTokenAmount);
    }

    function accRewardPerShare() internal view returns (uint256 result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += (maidCoin.nurseRaidAccReward() * 1e18) / totalPower;
        }
    }

    function _update() internal returns (uint256 result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += (maidCoin.mintForCloneNurse() * 1e18) / totalPower;
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }

    function claimAmountOf(uint256 id)
        external
        view
        override
        returns (uint256)
    {
        address master = ownerOf(id);
        if (master == address(0)) {
            return 0;
        }

        Nurse memory nurse = nurses[id];

        uint256 _originPower = originPower(nurse.nurseType);
        uint256 power = _originPower + nurse.supportPower;
        uint256 acc = (accRewardPerShare() * power) / 1e18;
        uint256 totalReward = 0;

        // owner
        if (master == msg.sender) {
            totalReward += (acc * _originPower) / power - nurse.masterAccReward;
        }

        // supporter
        uint256 supporterId = addrToSupporter[id][msg.sender];
        if (supporterId != 0) {
            uint256 supporterAccReward = (acc * nurse.supportPower) /
                power -
                nurse.supporterAccReward;
            Supporter memory supporter = supporters[id][supporterId];
            totalReward +=
                (supporterAccReward *
                    supporter.lpTokenAmount *
                    ratio.lpTokenToNursePower()) /
                ratio.precision() /
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

        uint256 masterAccReward = (acc * _originPower) /
            power -
            nurse.masterAccReward;
        nurse.masterAccReward += masterAccReward;

        uint256 supporterAccReward = (acc * nurse.supportPower) /
            power -
            nurse.supporterAccReward;
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
            uint256 reward = (supporterAccReward *
                supporter.lpTokenAmount *
                ratio.lpTokenToNursePower()) /
                ratio.precision() /
                nurse.supportPower -
                supporter.accReward;
            totalReward += reward;
            supporter.accReward += reward;
        }

        maidCoin.transfer(msg.sender, totalReward);
    }
}
