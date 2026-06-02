# CharityChain 🌊⬡

**Blockchain-powered transparency for charitable giving**

CharityChain is a decentralized application (DApp) that brings trust and accountability to charitable donations through milestone-based fund releases on Ethereum. Donors contribute with confidence knowing funds are held in escrow and only released when NGOs prove they've achieved specific goals.

---

## 🎯 Features

### For Donors
- **Full Transparency**: Every donation and fund release recorded permanently on-chain
- **Milestone-Based Giving**: Funds release only when NGOs complete and prove milestones
- **Zero Platform Fees**: 100% of your donation goes to the cause
- **Track Impact**: Monitor campaign progress and milestone completion in real-time

### For NGOs
- **Build Trust**: Prove impact with IPFS-stored evidence
- **Automated Fund Release**: Smart contracts transfer funds instantly upon milestone approval
- **Campaign Management**: Create campaigns with custom milestones and funding targets
- **Transparent History**: Build reputation through verifiable track record

### For Platform Admin
- **NGO Verification**: Review and verify NGO registrations before campaign creation
- **Milestone Approval**: Review proof submissions and approve fund releases
- **Platform Oversight**: Pause campaigns or revoke NGO verification if needed

---

## 🏗️ Architecture

### Smart Contracts (Solidity 0.8.20)

#### **CharityFactory.sol**
Central registry and factory contract that:
- Registers and verifies NGOs
- Deploys Campaign contracts
- Approves/rejects milestone proofs
- Maintains platform-wide state

#### **Campaign.sol**
Individual campaign contract that:
- Accepts donations and holds funds in escrow
- Manages milestone lifecycle (Pending → Proof Submitted → Completed)
- Tracks donor contributions
- Releases funds to NGO upon milestone approval

### Frontend (React + Vite)

Modern, responsive React application featuring:
- **Web3 Integration**: ethers.js 6 for wallet connection and contract interaction
- **Multi-Role UI**: Different views for donors, NGOs, and admin
- **Real-Time Updates**: Dynamic loading of blockchain data
- **Toast Notifications**: User-friendly feedback for all transactions

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/charity-transparency-dapp.git
cd charity-transparency-dapp

# Install smart contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Local Development

#### 1. Start Hardhat Local Node

```bash
npm run node
```

This starts a local Ethereum network at `http://127.0.0.1:8545` with test accounts.

#### 2. Deploy Contracts (New Terminal)

```bash
npm run deploy:local
```

Copy the deployed `CharityFactory` address from the output.

#### 3. Configure Frontend

Create `frontend/.env`:

```env
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

#### 5. Connect MetaMask

- Add Hardhat network to MetaMask:
  - Network Name: `Hardhat Local`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency: `ETH`

- Import test account from Hardhat (check terminal output for private keys)

---

## 📖 Usage Guide

### As an NGO

1. **Register**
   - Navigate to Dashboard → Register as NGO
   - Provide organization name, registration number, and IPFS profile hash
   - Wait for admin verification

2. **Create Campaign**
   - After verification, click "+ New Campaign"
   - Fill in campaign details (title, description, category, goal)
   - Define milestones with individual funding amounts
   - Submit transaction to deploy campaign contract

3. **Submit Milestone Proof**
   - Upload evidence to IPFS (via Pinata, Infura, or similar)
   - In campaign detail view, submit IPFS hash for completed milestone
   - Wait for admin approval

4. **Receive Funds**
   - Once admin approves, funds automatically transfer to your wallet
   - Track total released funds in campaign dashboard

### As a Donor

1. **Browse Campaigns**
   - Navigate to Campaigns page
   - Filter by category or search by name
   - View campaign details and milestones

2. **Donate**
   - Open campaign detail page
   - Enter donation amount in ETH
   - Confirm transaction in MetaMask
   - Track your contribution in campaign history

3. **Track Impact**
   - View milestone completion status
   - Check IPFS proof submissions
   - Monitor fund releases

### As Platform Admin

1. **Verify NGOs**
   - Navigate to Dashboard → NGO Registry
   - Review registration details
   - Click "Verify" to enable campaign creation

2. **Approve Milestones**
   - Open campaign detail page
   - Review submitted IPFS proof
   - Click "Approve & Release Funds" to trigger payment
   - Or "Reject" to request resubmission

---

## 🧪 Testing

### Run Test Suite

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Test Structure

- **CharityFactory Tests**: NGO registration, verification, campaign creation
- **Campaign Tests**: Donations, milestone proofs, fund releases, campaign lifecycle

All tests use Hardhat's local network and include edge cases, access control, and integration scenarios.

---

## 📁 Project Structure

```
charity-transparency-dapp/
├── contracts/                 # Solidity smart contracts
│   ├── CharityFactory.sol
│   └── Campaign.sol
├── scripts/                   # Deployment scripts
│   └── deploy.js
├── test/                      # Contract tests
│   └── CharityDApp.test.js
├── frontend/                  # React application
│   ├── src/
│   │   ├── abi/              # Contract ABIs
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Web3 context provider
│   │   ├── pages/            # Route pages
│   │   └── utils/            # Helper functions
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── hardhat.config.js         # Hardhat configuration
├── package.json
└── README.md
```

---

## 🌐 Deployment

### Sepolia Testnet

1. **Setup Environment**

Create `.env` in project root:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. **Get Test ETH**

Visit [Sepolia Faucet](https://sepoliafaucet.com/) to get testnet ETH.

3. **Deploy**

```bash
npm run deploy:sepolia
```

4. **Verify on Etherscan**

```bash
npx hardhat verify --network sepolia FACTORY_ADDRESS
```

5. **Update Frontend**

Update `frontend/.env`:

```env
VITE_FACTORY_ADDRESS=0xYourDeployedFactoryAddress
```

---

## 🔧 Smart Contract Details

### CharityFactory

| Function | Access | Description |
|----------|--------|-------------|
| `registerNGO()` | Public | Self-register as an NGO |
| `verifyNGO()` | Owner | Verify a registered NGO |
| `revokeNGO()` | Owner | Revoke NGO verification |
| `createCampaign()` | Verified NGO | Deploy new campaign contract |
| `approveMilestone()` | Owner | Approve milestone and release funds |
| `rejectMilestone()` | Owner | Reject milestone proof |

### Campaign

| Function | Access | Description |
|----------|--------|-------------|
| `donate()` | Public | Contribute ETH to campaign |
| `submitMilestoneProof()` | NGO | Submit IPFS hash as proof |
| `approveMilestone()` | Factory | Approve and release milestone funds |
| `rejectMilestone()` | Factory | Reject proof, allow resubmission |
| `getCampaignSummary()` | Public | Get campaign details |
| `getAllMilestones()` | Public | Get all milestone data |

### Key Enums

**CampaignStatus**: `Active`, `Paused`, `Completed`, `Cancelled`

**MilestoneStatus**: `Pending`, `ProofSubmitted`, `Completed`, `Rejected`

---

## 🛡️ Security Considerations

- **Access Control**: Strict role-based permissions (NGO, Owner, Factory)
- **Reentrancy Protection**: Uses checks-effects-interactions pattern
- **Input Validation**: Comprehensive require statements
- **Milestone Sum Validation**: Ensures milestone amounts equal campaign goal
- **Pausable Campaigns**: Admin can pause campaigns in emergencies

---

## 🧩 Tech Stack

### Blockchain
- Solidity 0.8.20
- Hardhat development environment
- ethers.js 6
- Ethereum (Hardhat local / Sepolia testnet)

### Frontend
- React 18
- Vite 5
- react-router-dom 6
- react-hot-toast
- CSS Modules

### Testing
- Chai assertions
- Hardhat network helpers
- Hardhat coverage

---

## 📊 Gas Optimization

The contracts are optimized with:
- Solidity optimizer enabled (200 runs)
- Via IR compilation pipeline
- Efficient storage patterns
- Batch operations where possible

---

## 🗺️ Roadmap

- [ ] Multi-signature milestone approval
- [ ] Decentralized verifier network (replace central admin)
- [ ] ERC-20 token donations
- [ ] NFT receipts for donors
- [ ] Campaign categories and discovery improvements
- [ ] Mobile app (React Native)
- [ ] Integration with The Graph for indexing
- [ ] On-chain governance for platform decisions

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenZeppelin for secure contract patterns
- Hardhat team for excellent dev tools
- IPFS for decentralized storage
- Ethereum community for support and resources

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact: zohaib.matloob@gmail.com
---

**Built with ❤️ for transparency in charitable giving**
