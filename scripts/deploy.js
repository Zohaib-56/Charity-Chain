const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("===========================================");
  console.log("  Charity Transparency DApp — Deployment  ");
  console.log("===========================================");
  console.log(`Deployer address : ${deployer.address}`);
  console.log(`Deployer balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("");

  // ── 1. Deploy CharityFactory ─────────────────────────────────────────────
  console.log("Deploying CharityFactory...");
  const CharityFactory = await ethers.getContractFactory("CharityFactory");
  const factory = await CharityFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✓ CharityFactory deployed at: ${factoryAddress}`);
  console.log("");

  // ── 2. Demo: Register & verify a test NGO ────────────────────────────────
  console.log("Setting up demo NGO...");
  const [, ngoWallet] = await ethers.getSigners();

  const registerTx = await factory.connect(ngoWallet).registerNGO(
    "Hope Relief Foundation",
    "NGO-2024-00123",
    "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"   // placeholder IPFS hash
  );
  await registerTx.wait();
  console.log(`✓ NGO registered: Hope Relief Foundation (${ngoWallet.address})`);

  const verifyTx = await factory.verifyNGO(ngoWallet.address);
  await verifyTx.wait();
  console.log(`✓ NGO verified by platform owner`);
  console.log("");

  // ── 3. Demo: Create a sample campaign ────────────────────────────────────
  console.log("Creating sample campaign...");
  const goalAmount = ethers.parseEther("3.0");   // 3 ETH total

  const createTx = await factory.connect(ngoWallet).createCampaign(
    "Emergency Relief — Flood Victims 2024",
    "Providing food, medical aid, and temporary shelter to 500 flood-affected families.",
    "Disaster Relief",
    goalAmount,
    90,                                            // 90-day campaign
    ["Food Aid", "Medical Support", "Shelter Provision"],
    [
      "Provide 30 days of food supplies to 500 families",
      "Deploy mobile medical units and medicines",
      "Construct 50 temporary shelter units",
    ],
    [
      ethers.parseEther("1.0"),                    // 1 ETH for food
      ethers.parseEther("1.0"),                    // 1 ETH for medical
      ethers.parseEther("1.0"),                    // 1 ETH for shelter
    ]
  );

  const receipt = await createTx.wait();

  // Extract campaign address from emitted event
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "CampaignCreated"
  );
  const campaignAddress = event ? event.args[1] : "check logs";
  console.log(`✓ Sample campaign deployed at: ${campaignAddress}`);
  console.log("");

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log("===========================================");
  console.log("  Deployment Summary                      ");
  console.log("===========================================");
  console.log(`CharityFactory : ${factoryAddress}`);
  console.log(`Sample Campaign: ${campaignAddress}`);
  console.log(`Network        : ${network.name}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Copy contract addresses into your frontend .env");
  console.log("  2. Copy ABI files from artifacts/ to frontend/src/abi/");
  console.log("  3. Run: npx hardhat test");
  console.log("===========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
