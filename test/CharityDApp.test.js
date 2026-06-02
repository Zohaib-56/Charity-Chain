const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { time }          = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue }      = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ETH = (n) => ethers.parseEther(n.toString());
const IPFS_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

async function deployFactory() {
  const [owner, ngo1, ngo2, donor1, donor2, donor3] = await ethers.getSigners();
  const CharityFactory = await ethers.getContractFactory("CharityFactory");
  const factory = await CharityFactory.deploy();
  await factory.waitForDeployment();
  return { factory, owner, ngo1, ngo2, donor1, donor2, donor3 };
}

async function deployWithVerifiedNGO() {
  const ctx = await deployFactory();
  const { factory, ngo1 } = ctx;

  await factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH);
  await factory.verifyNGO(ngo1.address);

  return ctx;
}

async function deployWithCampaign() {
  const ctx = await deployWithVerifiedNGO();
  const { factory, ngo1 } = ctx;

  const tx = await factory.connect(ngo1).createCampaign(
    "Flood Relief 2024",
    "Aid for flood victims",
    "Disaster Relief",
    ETH(3),
    90,
    ["Food Aid", "Medical Support", "Shelter"],
    ["Food supplies", "Mobile medical units", "Temporary shelters"],
    [ETH(1), ETH(1), ETH(1)]
  );
  const receipt = await tx.wait();
  const event   = receipt.logs.find((l) => l.fragment?.name === "CampaignCreated");
  const campaignAddress = event.args[1];
  const Campaign = await ethers.getContractFactory("Campaign");
  const campaign = Campaign.attach(campaignAddress);

  return { ...ctx, campaign, campaignAddress };
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("CharityFactory", () => {
  // ── Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("sets the deployer as owner", async () => {
      const { factory, owner } = await deployFactory();
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("initialises campaign & NGO counts to zero", async () => {
      const { factory } = await deployFactory();
      expect(await factory.campaignCount()).to.equal(0);
      expect(await factory.ngoCount()).to.equal(0);
    });
  });

  // ── NGO Registration ────────────────────────────────────────────────────
  describe("NGO Registration", () => {
    it("allows an address to register as an NGO", async () => {
      const { factory, ngo1 } = await deployFactory();
      const tx = await factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH);
      await expect(tx)
        .to.emit(factory, "NGORegistered")
        .withArgs(ngo1.address, "Hope Relief", anyValue);

      const info = await factory.getNGOInfo(ngo1.address);
      expect(info.name).to.equal("Hope Relief");
      expect(info.isRegistered).to.be.true;
      expect(info.isVerified).to.be.false;
    });

    it("prevents double registration", async () => {
      const { factory, ngo1 } = await deployFactory();
      await factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH);
      await expect(factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH))
        .to.be.revertedWith("Factory: NGO already registered");
    });

    it("rejects empty NGO name", async () => {
      const { factory, ngo1 } = await deployFactory();
      await expect(factory.connect(ngo1).registerNGO("", "NGO-001", IPFS_HASH))
        .to.be.revertedWith("Factory: name cannot be empty");
    });
  });

  // ── NGO Verification ────────────────────────────────────────────────────
  describe("NGO Verification", () => {
    it("allows owner to verify an NGO", async () => {
      const { factory, owner, ngo1 } = await deployFactory();
      await factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH);
      await expect(factory.connect(owner).verifyNGO(ngo1.address))
        .to.emit(factory, "NGOVerified");

      const info = await factory.getNGOInfo(ngo1.address);
      expect(info.isVerified).to.be.true;
    });

    it("prevents non-owner from verifying", async () => {
      const { factory, ngo1, ngo2 } = await deployFactory();
      await factory.connect(ngo1).registerNGO("Hope Relief", "NGO-001", IPFS_HASH);
      await expect(factory.connect(ngo2).verifyNGO(ngo1.address))
        .to.be.revertedWith("Factory: caller is not the owner");
    });

    it("allows owner to revoke NGO verification", async () => {
      const { factory, ngo1 } = await deployWithVerifiedNGO();
      await factory.revokeNGO(ngo1.address);
      const info = await factory.getNGOInfo(ngo1.address);
      expect(info.isVerified).to.be.false;
    });
  });

  // ── Campaign Creation ────────────────────────────────────────────────────
  describe("Campaign Creation", () => {
    it("verified NGO can create a campaign", async () => {
      const { factory, ngo1 } = await deployWithVerifiedNGO();

      await expect(
        factory.connect(ngo1).createCampaign(
          "Flood Relief",
          "Aid for victims",
          "Disaster",
          ETH(2),
          60,
          ["Food", "Shelter"],
          ["Food supplies", "Temporary shelter"],
          [ETH(1), ETH(1)]
        )
      ).to.emit(factory, "CampaignCreated");

      expect(await factory.campaignCount()).to.equal(1);
    });

    it("unverified NGO cannot create a campaign", async () => {
      const { factory, ngo2 } = await deployWithVerifiedNGO();
      await factory.connect(ngo2).registerNGO("Another NGO", "NGO-002", IPFS_HASH);

      await expect(
        factory.connect(ngo2).createCampaign("Test", "Test", "Test", ETH(1), 30, ["M1"], ["D1"], [ETH(1)])
      ).to.be.revertedWith("Factory: NGO not yet verified");
    });

    it("rejects milestone amounts that don't sum to goal", async () => {
      const { factory, ngo1 } = await deployWithVerifiedNGO();

      await expect(
        factory.connect(ngo1).createCampaign(
          "Bad Campaign", "Desc", "Cat", ETH(3), 30,
          ["M1", "M2"],
          ["D1", "D2"],
          [ETH(1), ETH(1)]   // sums to 2, goal is 3
        )
      ).to.be.revertedWith("Campaign: milestone amounts must equal goal");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Campaign", () => {
  // ── Donations ────────────────────────────────────────────────────────────
  describe("Donations", () => {
    it("accepts donations and tracks donor info", async () => {
      const { campaign, donor1 } = await deployWithCampaign();

      await expect(campaign.connect(donor1).donate({ value: ETH(0.5) }))
        .to.emit(campaign, "DonationReceived")
        .withArgs(donor1.address, ETH(0.5), anyValue);

      const info = await campaign.getDonorInfo(donor1.address);
      expect(info.totalDonated).to.equal(ETH(0.5));
    });

    it("tracks multiple donations from the same donor", async () => {
      const { campaign, donor1 } = await deployWithCampaign();
      await campaign.connect(donor1).donate({ value: ETH(0.3) });
      await campaign.connect(donor1).donate({ value: ETH(0.7) });

      const info = await campaign.getDonorInfo(donor1.address);
      expect(info.totalDonated).to.equal(ETH(1.0));
      expect(info.donationAmounts.length).to.equal(2);
    });

    it("adds donor to donor list only once", async () => {
      const { campaign, donor1 } = await deployWithCampaign();
      await campaign.connect(donor1).donate({ value: ETH(0.1) });
      await campaign.connect(donor1).donate({ value: ETH(0.1) });

      const list = await campaign.getDonorList();
      expect(list.length).to.equal(1);
    });

    it("rejects zero-value donations", async () => {
      const { campaign, donor1 } = await deployWithCampaign();
      await expect(campaign.connect(donor1).donate({ value: 0 }))
        .to.be.revertedWith("Campaign: donation must be > 0");
    });
  });

  // ── Milestone Proof Submission ────────────────────────────────────────────
  describe("Milestone Proof Submission", () => {
    it("NGO can submit proof for a milestone", async () => {
      const { campaign, ngo1 } = await deployWithCampaign();

      await expect(campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH))
        .to.emit(campaign, "ProofSubmitted")
        .withArgs(0, IPFS_HASH, anyValue);

      const m = await campaign.getMilestone(0);
      expect(m.status).to.equal(1);  // ProofSubmitted
      expect(m.proofIPFSHash).to.equal(IPFS_HASH);
    });

    it("non-NGO cannot submit proof", async () => {
      const { campaign, donor1 } = await deployWithCampaign();
      await expect(campaign.connect(donor1).submitMilestoneProof(0, IPFS_HASH))
        .to.be.revertedWith("Campaign: caller is not the NGO");
    });

    it("rejects empty IPFS hash", async () => {
      const { campaign, ngo1 } = await deployWithCampaign();
      await expect(campaign.connect(ngo1).submitMilestoneProof(0, ""))
        .to.be.revertedWith("Campaign: IPFS hash cannot be empty");
    });

    it("rejects duplicate proof submission", async () => {
      const { campaign, ngo1 } = await deployWithCampaign();
      await campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH);
      await expect(campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH))
        .to.be.revertedWith("Campaign: milestone not pending");
    });
  });

  // ── Milestone Approval & Fund Release ────────────────────────────────────
  describe("Milestone Approval and Fund Release", () => {
    it("factory can approve milestone and release funds to NGO", async () => {
      const { factory, campaign, campaignAddress, ngo1, donor1, donor2, donor3 } =
        await deployWithCampaign();

      // Fund the campaign
      await campaign.connect(donor1).donate({ value: ETH(1) });
      await campaign.connect(donor2).donate({ value: ETH(1) });
      await campaign.connect(donor3).donate({ value: ETH(1) });

      // NGO submits proof
      await campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH);

      // Record NGO balance before
      const balanceBefore = await ethers.provider.getBalance(ngo1.address);

      // Approve milestone (factory/owner)
      await factory.approveMilestone(campaignAddress, 0);

      // NGO should receive 1 ETH
      const balanceAfter = await ethers.provider.getBalance(ngo1.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(ETH(1), ETH(0.01));

      const m = await campaign.getMilestone(0);
      expect(m.status).to.equal(2);  // Completed
      expect(m.releasedAmount).to.equal(ETH(1));
    });

    it("auto-marks campaign as Completed when all milestones done", async () => {
      const { factory, campaign, campaignAddress, ngo1, donor1 } =
        await deployWithCampaign();

      await campaign.connect(donor1).donate({ value: ETH(3) });

      for (let i = 0; i < 3; i++) {
        await campaign.connect(ngo1).submitMilestoneProof(i, IPFS_HASH);
        await factory.approveMilestone(campaignAddress, i);
      }

      expect(await campaign.status()).to.equal(2);  // CampaignStatus.Completed
    });

    it("factory can reject a milestone proof and allow resubmission", async () => {
      const { factory, campaign, campaignAddress, ngo1 } = await deployWithCampaign();

      await campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH);
      await factory.rejectMilestone(campaignAddress, 0, "Insufficient evidence");

      // After rejection status resets to Pending → NGO can resubmit
      const m = await campaign.getMilestone(0);
      expect(m.status).to.equal(0);  // Pending

      // NGO resubmits
      await expect(campaign.connect(ngo1).submitMilestoneProof(0, IPFS_HASH))
        .to.emit(campaign, "ProofSubmitted");
    });
  });

  // ── Campaign Summary ──────────────────────────────────────────────────────
  describe("Campaign Summary", () => {
    it("returns accurate campaign summary", async () => {
      const { campaign, donor1 } = await deployWithCampaign();
      await campaign.connect(donor1).donate({ value: ETH(1.5) });

      const summary = await campaign.getCampaignSummary();
      expect(summary.title).to.equal("Flood Relief 2024");
      expect(summary.goal).to.equal(ETH(3));
      expect(summary.donated).to.equal(ETH(1.5));
      expect(summary.milestoneCount).to.equal(3);
    });
  });
});