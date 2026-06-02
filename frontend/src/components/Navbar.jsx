import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { account, shortAddress, connecting, connectWallet, disconnectWallet, ngoInfo, isOwner } = useWeb3()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => setMenuOpen(false), [location])

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>CharityChain</span>
        </Link>

        {/* Nav links */}
        <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          <Link to="/campaigns" className={styles.link}>Campaigns</Link>
          {account && (
            <Link to="/dashboard" className={styles.link}>
              {isOwner ? 'Admin' : 'Dashboard'}
            </Link>
          )}
          {account && !ngoInfo?.isRegistered && !isOwner && (
            <Link to="/register-ngo" className={styles.link}>Register NGO</Link>
          )}
        </div>

        {/* Wallet button */}
        <div className={styles.walletArea}>
          {account ? (
            <div className={styles.accountInfo}>
              {ngoInfo?.isVerified && (
                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>✓ NGO</span>
              )}
              {isOwner && (
                <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>Admin</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={disconnectWallet}>
                <span className={styles.dot} />
                {shortAddress}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={connectWallet} disabled={connecting}>
              {connecting ? <span className="spinner" style={{width:14,height:14}} /> : '⬡'}
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
          <button className={styles.burger} onClick={() => setMenuOpen(v => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  )
}
