// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";

/**
 * @title CharityFactory
 * @dev Registry and factory for all charity campaigns on the platform.
 *      - Registers and verifies NGOs
 *      - Deploys new Campaign contracts
 *      - Acts as the trusted verifier for milestone approvals
 *      - Emits platform-wide events for the frontend to index
 */
contract CharityFactory {
    // ─── Structs ──────────────────────────────────────────────────────────────

    struct NGO {
        string  name;
        string  registrationNumber;  // official registration ID
        string  ipfsProfileHash;     // IPFS CID of NGO documents
        bool    isVerified;
        bool    isRegistered;
        uint256 registeredAt;
        address wallet;
        uint256[] campaignIds;
    }

    // ─── State variables ──────────────────────────────────────────────────────

    address public owner;           // platform admin
    uint256 public campaignCount;
    uint256 public ngoCount;

    mapping(address => NGO)      public ngos;
    mapping(uint256 => address)  public campaigns;        // campaignId => Campaign address
    mapping(address => uint256)  public campaignIds;      // Campaign address => campaignId
    mapping(address => bool)     public isCampaign;       // quick lookup

    address[] private ngoList;
    address[] private campaignList;

    // ─── Events ───────────────────────────────────────────────────────────────

    event NGORegistered(address indexed ngoWallet, string name, uint256 timestamp);
    event NGOVerified(address indexed ngoWallet, uint256 timestamp);
    event NGORevoked(address indexed ngoWallet, uint256 timestamp);
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed campaignAddress,
        address indexed ngo,
        string title,
        uint256 goalAmount,
        uint256 timestamp
    );
    event MilestoneApproved(
        address indexed campaign,
        uint256 indexed milestoneIndex,
        uint256 amountReleased,
        uint256 timestamp
    );
    event MilestoneRejected(
        address indexed campaign,
        uint256 indexed milestoneIndex,
        string reason,
        uint256 timestamp
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Factory: caller is not the owner");
        _;
    }

    modifier onlyVerifiedNGO() {
        require(ngos[msg.sender].isRegistered, "Factory: not a registered NGO");
        require(ngos[msg.sender].isVerified,   "Factory: NGO not yet verified");
        _;
    }

    modifier validCampaign(address _campaign) {
        require(isCampaign[_campaign], "Factory: not a registered campaign");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── NGO management ───────────────────────────────────────────────────────

    /**
     * @dev NGO self-registers with their official details.
     *      Platform owner must verify before they can create campaigns.
     */
    function registerNGO(
        string calldata _name,
        string calldata _registrationNumber,
        string calldata _ipfsProfileHash
    ) external {
        require(!ngos[msg.sender].isRegistered, "Factory: NGO already registered");
        require(bytes(_name).length > 0, "Factory: name cannot be empty");

        ngos[msg.sender] = NGO({
            name:               _name,
            registrationNumber: _registrationNumber,
            ipfsProfileHash:    _ipfsProfileHash,
            isVerified:         false,
            isRegistered:       true,
            registeredAt:       block.timestamp,
            wallet:             msg.sender,
            campaignIds:        new uint256[](0)
        });

        ngoList.push(msg.sender);
        ngoCount++;

        emit NGORegistered(msg.sender, _name, block.timestamp);
    }

    /**
     * @dev Platform owner verifies an NGO after off-chain due diligence.
     */
    function verifyNGO(address _ngo) external onlyOwner {
        require(ngos[_ngo].isRegistered,  "Factory: NGO not registered");
        require(!ngos[_ngo].isVerified,   "Factory: NGO already verified");
        ngos[_ngo].isVerified = true;
        emit NGOVerified(_ngo, block.timestamp);
    }

    /**
     * @dev Revoke NGO verification in case of misconduct.
     */
    function revokeNGO(address _ngo) external onlyOwner {
        require(ngos[_ngo].isVerified, "Factory: NGO not verified");
        ngos[_ngo].isVerified = false;
        emit NGORevoked(_ngo, block.timestamp);
    }

    // ─── Campaign creation ────────────────────────────────────────────────────

    /**
     * @dev Verified NGO deploys a new fundraising campaign.
     */
    function createCampaign(
        string  calldata _title,
        string  calldata _description,
        string  calldata _category,
        uint256 _goalAmount,
        uint256 _durationDays,
        string[] calldata _milestoneTitles,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneAmounts
    ) external onlyVerifiedNGO returns (address) {
        require(_goalAmount > 0,         "Factory: goal must be > 0");
        require(_durationDays > 0,       "Factory: duration must be > 0");
        require(_milestoneTitles.length > 0, "Factory: need at least one milestone");

        Campaign newCampaign = new Campaign(
            msg.sender,
            _title,
            _description,
            _category,
            _goalAmount,
            _durationDays,
            _milestoneTitles,
            _milestoneDescriptions,
            _milestoneAmounts
        );

        address campaignAddr = address(newCampaign);
        uint256 campaignId   = campaignCount;

        campaigns[campaignId]        = campaignAddr;
        campaignIds[campaignAddr]    = campaignId;
        isCampaign[campaignAddr]     = true;
        ngos[msg.sender].campaignIds.push(campaignId);
        campaignList.push(campaignAddr);
        campaignCount++;

        emit CampaignCreated(campaignId, campaignAddr, msg.sender, _title, _goalAmount, block.timestamp);

        return campaignAddr;
    }

    // ─── Milestone verification ───────────────────────────────────────────────

    /**
     * @dev Platform owner approves a milestone proof and triggers fund release.
     */
    function approveMilestone(address _campaign, uint256 _milestoneIndex)
        external
        onlyOwner
        validCampaign(_campaign)
    {
        Campaign(payable(_campaign)).approveMilestone(_milestoneIndex);
        emit MilestoneApproved(_campaign, _milestoneIndex, 0, block.timestamp);
    }

    /**
     * @dev Platform owner rejects a milestone proof.
     */
    function rejectMilestone(address _campaign, uint256 _milestoneIndex, string calldata _reason)
        external
        onlyOwner
        validCampaign(_campaign)
    {
        Campaign(payable(_campaign)).rejectMilestone(_milestoneIndex, _reason);
        emit MilestoneRejected(_campaign, _milestoneIndex, _reason, block.timestamp);
    }

    /**
     * @dev Emergency pause/resume for a campaign.
     */
    function setCampaignStatus(address _campaign, Campaign.CampaignStatus _status)
        external
        onlyOwner
        validCampaign(_campaign)
    {
        Campaign(payable(_campaign)).setCampaignStatus(_status);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getNGOInfo(address _ngo) external view returns (NGO memory) {
        return ngos[_ngo];
    }

    function getNGOCampaigns(address _ngo) external view returns (uint256[] memory) {
        return ngos[_ngo].campaignIds;
    }

    function getAllNGOs() external view returns (address[] memory) {
        return ngoList;
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return campaignList;
    }

    function getCampaignAddress(uint256 _id) external view returns (address) {
        return campaigns[_id];
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Factory: invalid address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
