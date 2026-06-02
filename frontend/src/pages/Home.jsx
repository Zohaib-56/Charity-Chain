import React from 'react'
import { Link } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'
import styles from './Home.module.css'

const FEATURES = [
  { icon: '🔒', title: 'Funds in Escrow',      desc: 'Donations are locked in smart contracts and only released when milestones are independently verified.' },
  { icon: '📋', title: 'Milestone-Based',       desc: 'Every campaign has predefined milestones. NGOs receive funds only after completing each stage.' },
  { icon: '🔍', title: 'Full Transparency',     desc: 'Every donation and fund release is recorded on the blockchain — permanently and publicly.' },
  { icon: '📎', title: 'IPFS Proof Storage',    desc: 'NGOs upload evidence to IPFS. The hash is stored on-chain so proof can never be altered.' },
  { icon: '⚡', title: 'Instant Releases',      desc: 'Smart contracts automatically transfer funds the moment a milestone is approved — no delays.' },
  { icon: '🌐', title: 'Decentralised',         desc: 'No central authority controls the funds. The code is the contract, and it runs on Ethereum.' },
]

export default function Home() {
  const { account, connectWallet, connecting } = useWeb3()

  return (
    <div className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={`container ${styles.heroContent}`}>
          <div className={`badge badge-green ${styles.heroBadge}`}>
            Built on Ethereum · Powered by Smart Contracts
          </div>
          <h1 className={styles.heroTitle}>
            Charity giving,<br />
            <span className={styles.heroAccent}>transparently.</span>
          </h1>
          <p className={styles.heroSub}>
            CharityChain connects donors with verified NGOs through milestone-based
            smart contracts. Every donation is tracked on-chain. Funds release only
            when results are proven.
          </p>
          <div className={styles.heroCta}>
            <Link to="/campaigns" className="btn btn-primary btn-lg">
              Browse Campaigns →
            </Link>
            {!account && (
              <button className="btn btn-outline btn-lg" onClick={connectWallet} disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>

          {/* Stats strip */}
          <div className={styles.statsStrip}>
            {[
              ['100%', 'On-chain transparency'],
              ['0%',   'Platform fees'],
              ['NGO',  'Verified organisations'],
              ['Auto', 'Smart fund release'],
            ].map(([val, label]) => (
              <div key={label} className={styles.statItem}>
                <span className={styles.statNum}>{val}</span>
                <span className={styles.statDesc}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>How it works</h2>
            <p className={styles.sectionSub}>Four steps from donation to verified impact</p>
          </div>
          <div className={styles.steps}>
            {[
              { n:'01', title:'NGO registers',   desc:'Organisations register and get verified by the platform admin after identity checks.' },
              { n:'02', title:'Campaign created', desc:'Verified NGOs create campaigns with clear milestones and funding targets for each stage.' },
              { n:'03', title:'Donors contribute',desc:'Anyone can donate ETH to campaigns. Funds are held securely in the smart contract.' },
              { n:'04', title:'Milestones unlock',desc:'NGOs submit IPFS proof. Admin verifies. Funds release automatically — no human custody.' },
            ].map((s, i) => (
              <div key={i} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Why CharityChain</h2>
            <p className={styles.sectionSub}>Built for accountability from the ground up</p>
          </div>
          <div className={styles.features}>
            {FEATURES.map((f, i) => (
              <div key={i} className={styles.feature}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>Ready to make an impact?</h2>
            <p className={styles.ctaSub}>Browse active campaigns and donate with full confidence your funds reach their destination.</p>
            <Link to="/campaigns" className="btn btn-primary btn-lg">
              View All Campaigns →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
