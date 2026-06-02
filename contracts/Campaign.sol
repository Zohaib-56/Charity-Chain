// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Campaign
 * @dev Manages a single charitable fundraising campaign with milestone-based fund release.
 *      Each campaign is deployed by CharityFactory on behalf of a registered NGO.
 */
contract Campaign {
    // ─── Enums ────────────────────────────────────────────────────────────────

    enum MilestoneStatus { Pending, ProofSubmitted, Completed, Rejected }
    enum CampaignStatus  { Active, Paused, Completed, Cancelled }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Milestone {
        string  title;             // e.g. "Food Aid", "Medical Support"
        string  description;
        uint256 targetAmount;      // funds to release upon completion (in wei)
        uint256 releasedAmount;    // actual amount released
        string  proofIPFSHash;     // IPFS CID of submitted proof document
        MilestoneStatus status;
        uint256 submittedAt;       // timestamp of proof submission
        uint256 completedAt;       // timestamp of fund release
    }

    struct DonorInfo {
        uint256 totalDonated;
        uint256[] donationTimestamps;
        uint256[] donationAmounts;
    }

    // ─── State variables ──────────────────────────────────────────────────────

    address public factory;
    address public ngo;            // NGO wallet address
    string  public campaignTitle;
    string  public description;
    string  public category;       // "Healthcare" | "Food" | "Shelter" | "Education"
    uint256 public goalAmount;     // total fundraising goal (wei)
    uint256 public deadline;       // UNIX timestamp
    uint256 public totalDonated;
    uint256 public totalReleased;

    CampaignStatus public status;
    Milestone[]    public milestones;

    address[] private donorList;
    mapping(address => DonorInfo) public donors;
    mapping(address => bool)      private hasDonated;

    // ─── Events ───────────────────────────────────────────────────────────────

    event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp);
    event ProofSubmitted(uint256 indexed milestoneIndex, string ipfsHash, uint256 timestamp);
    event MilestoneCompleted(uint256 indexed milestoneIndex, uint256 amountReleased, uint256 timestamp);
    event MilestoneRejected(uint256 indexed milestoneIndex, string reason);
    event CampaignStatusChanged(CampaignStatus newStatus);
    event RefundIssued(address indexed donor, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyNGO() {
        require(msg.sender == ngo, "Campaign: caller is not the NGO");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Campaign: caller is not the factory");
        _;
    }

    modifier campaignActive() {
        require(status == CampaignStatus.Active, "Campaign: not active");
        require(block.timestamp <= deadline, "Campaign: deadline passed");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _ngo,
        string  memory _title,
        string  memory _description,
        string  memory _category,
        uint256 _goalAmount,
        uint256 _durationDays,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts
    ) {
        require(_ngo != address(0), "Campaign: invalid NGO address");
        require(_goalAmount > 0, "Campaign: goal must be > 0");
        require(_milestoneTitles.length > 0, "Campaign: need at least one milestone");
        require(
            _milestoneTitles.length == _milestoneDescriptions.length &&
            _milestoneTitles.length == _milestoneAmounts.length,
            "Campaign: milestone array length mismatch"
        );

        factory       = msg.sender;
        ngo           = _ngo;
        campaignTitle = _title;
        description   = _description;
        category      = _category;
        goalAmount    = _goalAmount;
        deadline      = block.timestamp + (_durationDays * 1 days);
        status        = CampaignStatus.Active;

        // Validate milestone amounts sum to goalAmount
        uint256 totalMilestoneAmount;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            totalMilestoneAmount += _milestoneAmounts[i];
            milestones.push(Milestone({
                title:          _milestoneTitles[i],
                description:    _milestoneDescriptions[i],
                targetAmount:   _milestoneAmounts[i],
                releasedAmount: 0,
                proofIPFSHash:  "",
                status:         MilestoneStatus.Pending,
                submittedAt:    0,
                completedAt:    0
            }));
        }
        require(totalMilestoneAmount == _goalAmount, "Campaign: milestone amounts must equal goal");
    }

    // ─── Donor functions ──────────────────────────────────────────────────────

    /**
     * @dev Accept a donation. Funds are held in the contract until milestones are verified.
     */
    function donate() external payable campaignActive {
        require(msg.value > 0, "Campaign: donation must be > 0");

        if (!hasDonated[msg.sender]) {
            hasDonated[msg.sender] = true;
            donorList.push(msg.sender);
        }

        donors[msg.sender].totalDonated += msg.value;
        donors[msg.sender].donationTimestamps.push(block.timestamp);
        donors[msg.sender].donationAmounts.push(msg.value);

        totalDonated += msg.value;

        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }

    // ─── NGO functions ────────────────────────────────────────────────────────

    /**
     * @dev NGO submits an IPFS hash as proof of milestone completion.
     * @param _milestoneIndex Index of the milestone being completed.
     * @param _ipfsHash       IPFS CID of the supporting document/image.
     */
    function submitMilestoneProof(uint256 _milestoneIndex, string calldata _ipfsHash)
        external
        onlyNGO
    {
        require(_milestoneIndex < milestones.length, "Campaign: invalid milestone index");
        Milestone storage m = milestones[_milestoneIndex];
        require(m.status == MilestoneStatus.Pending, "Campaign: milestone not pending");
        require(bytes(_ipfsHash).length > 0, "Campaign: IPFS hash cannot be empty");

        m.proofIPFSHash = _ipfsHash;
        m.status        = MilestoneStatus.ProofSubmitted;
        m.submittedAt   = block.timestamp;

        emit ProofSubmitted(_milestoneIndex, _ipfsHash, block.timestamp);
    }

    // ─── Factory / verifier functions ─────────────────────────────────────────

    /**
     * @dev Called by factory (or a designated verifier) to approve a milestone
     *      and automatically release the allocated funds to the NGO.
     */
    function approveMilestone(uint256 _milestoneIndex) external onlyFactory {
        require(_milestoneIndex < milestones.length, "Campaign: invalid milestone index");
        Milestone storage m = milestones[_milestoneIndex];
        require(m.status == MilestoneStatus.ProofSubmitted, "Campaign: proof not submitted");

        uint256 releaseAmount = m.targetAmount;
        require(address(this).balance >= releaseAmount, "Campaign: insufficient contract balance");

        m.status         = MilestoneStatus.Completed;
        m.releasedAmount = releaseAmount;
        m.completedAt    = block.timestamp;
        totalReleased   += releaseAmount;

        // Transfer funds to NGO
        (bool success, ) = payable(ngo).call{value: releaseAmount}("");
        require(success, "Campaign: ETH transfer to NGO failed");

        emit MilestoneCompleted(_milestoneIndex, releaseAmount, block.timestamp);

        // Auto-complete campaign if all milestones done
        _checkCampaignCompletion();
    }

    /**
     * @dev Reject a submitted milestone proof, resetting it to Pending.
     */
    function rejectMilestone(uint256 _milestoneIndex, string calldata _reason)
        external
        onlyFactory
    {
        require(_milestoneIndex < milestones.length, "Campaign: invalid milestone index");
        Milestone storage m = milestones[_milestoneIndex];
        require(m.status == MilestoneStatus.ProofSubmitted, "Campaign: proof not submitted");

        m.status        = MilestoneStatus.Rejected;
        m.proofIPFSHash = "";
        m.submittedAt   = 0;

        emit MilestoneRejected(_milestoneIndex, _reason);

        // Allow NGO to resubmit
        m.status = MilestoneStatus.Pending;
    }

    /**
     * @dev Pause or resume the campaign.
     */
    function setCampaignStatus(CampaignStatus _status) external onlyFactory {
        status = _status;
        emit CampaignStatusChanged(_status);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getMilestone(uint256 _index) external view returns (Milestone memory) {
        require(_index < milestones.length, "Campaign: invalid index");
        return milestones[_index];
    }

    function getAllMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }

    function getDonorList() external view returns (address[] memory) {
        return donorList;
    }

    function getDonorInfo(address _donor) external view returns (DonorInfo memory) {
        return donors[_donor];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getCampaignSummary() external view returns (
        string  memory title,
        string  memory cat,
        address ngoAddr,
        uint256 goal,
        uint256 donated,
        uint256 released,
        uint256 balance,
        uint256 dline,
        CampaignStatus cStatus,
        uint256 milestoneCount
    ) {
        return (
            campaignTitle,
            category,
            ngo,
            goalAmount,
            totalDonated,
            totalReleased,
            address(this).balance,
            deadline,
            status,
            milestones.length
        );
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _checkCampaignCompletion() internal {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.Completed) return;
        }
        status = CampaignStatus.Completed;
        emit CampaignStatusChanged(CampaignStatus.Completed);
    }

    // Allow contract to receive ETH directly
    receive() external payable {
        totalDonated += msg.value;
    }
}
