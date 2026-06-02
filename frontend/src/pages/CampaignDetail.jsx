import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { CAMPAIGN_ABI } from '../abi/contracts'
import MilestoneItem from '../components/MilestoneItem'
import {
  formatEthShort, formatDate, progressPercent,
  timeLeft, CAMPAIGN_STATUS, CATEGORY_ICONS, shortAddress
} from '../utils/helpers'
import styles from './CampaignDetail.module.css'

export default function CampaignDetail() {
  const { address }                   = useParams()
  const { signer, provider, account, isOwner, ngoInfo } = useWeb3()
  const [summary,     setSummary]     = useState(null)
  const [milestones,  setMilestones]  = useState([])
  const [donorInfo,   setDonorInfo]   = useState(null)
  const [donorCount,  setDonorCount]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [donating,    setDonating]    = useState(false)
  const [ethAmount,   setEthAmount]   = useState('')

  const isNGO = ngoInfo && summary && account?.toLowerCase() === summary.ngoAddr?.toLowerCase()

  const load = useCallback(async () => {
    try {
      const _provider = signer?.provider || provider || new ethers.JsonRpcProvider('http://127.0.0.1:8545')
      const contract  = new ethers.Contract(address, CAMPAIGN_ABI, _provider)

      const [_summary, _milestones, _donors] = await Promise.all([
        contract.getCampaignSummary(),
        contract.getAllMilestones(),
        contract.getDonorList(),
      ])
      setSummary(_summary)
      setMilestones(_milestones)
      setDonorCount(_donors.length)

      if (account) {
        try {
          const info = await contract.getDonorInfo(account)
          setDonorInfo(info)
        } catch (_) {}
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [address, signer, provider, account])

  useEffect(() => { load() }, [load])

  const handleDonate = async () => {
    if (!ethAmount || isNaN(ethAmount) || Number(ethAmount) <= 0)
      return toast.error('Enter a valid ETH amount')
    if (!signer) return toast.error('Connect your wallet first')

    setDonating(true)
    try {
      const contract = new ethers.Contract(address, CAMPAIGN_ABI, signer)
      const tx = await contract.donate({ value: ethers.parseEther(ethAmount) })
      toast.loading('Processing donation…', { id: 'donate' })
      await tx.wait()
      toast.success(`Donated ${ethAmount} ETH — thank you! 💚`, { id: 'donate' })
      setEthAmount('')
      load()
    } catch (err) {
      toast.error(err.reason || err.message?.slice(0, 80) || 'Donation failed', { id: 'donate' })
    } finally {
      setDonating(false)
    }
  }

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
      <span className="spinner" style={{ width:40, height:40 }} />
    </div>
  )

  if (!summary) return (
    <div className="page">
      <div className="container" style={{ padding:'4rem 0', textAlign:'center', color:'var(--text2)' }}>
        Campaign not found.
      </div>
    </div>
  )

  const pct           = progressPercent(summary.donated, summary.goal)
  const statusInfo    = CAMPAIGN_STATUS[Number(summary.cStatus)] || CAMPAIGN_STATUS[0]
  const icon          = CATEGORY_ICONS[summary.cat] || '💛'
  const myDonated     = donorInfo?.totalDonated || 0n
  const completedCount = milestones.filter(m => Number(m.status) === 2).length

  return (
    <div className="page">
      <div className={`container ${styles.layout}`}>

        {/* ── Left column ──────────────────────────────────── */}
        <div className={styles.main}>
          {/* Campaign header */}
          <div className={styles.campaignHeader}>
            <div className={styles.campaignIcon}>{icon}</div>
            <div className={styles.campaignMeta}>
              <div className={styles.metaBadges}>
                <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                <span className="badge badge-gray">{summary.cat}</span>
                {isNGO   && <span className="badge badge-amber">Your Campaign</span>}
                {isOwner && <span className="badge badge-blue">Admin View</span>}
              </div>
              <h1 className={styles.campaignTitle}>{summary.title}</h1>
              <p className={styles.campaignNgo}>
                by <span className={styles.ngoAddr}>{shortAddress(summary.ngoAddr)}</span>
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className={styles.progressStats}>
              <div>
                <div className={styles.bigNum}>{formatEthShort(summary.donated)}</div>
                <div className={styles.bigLabel}>raised of {formatEthShort(summary.goal)} goal</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div className={styles.bigNum}>{donorCount}</div>
                <div className={styles.bigLabel}>donors</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className={styles.bigNum}>{timeLeft(summary.dline)}</div>
                <div className={styles.bigLabel}>remaining</div>
              </div>
            </div>
            <div className="progress-bar" style={{ height:10, margin:'1.25rem 0 0.5rem' }}>
              <div className="progress-fill" style={{ width:`${pct}%` }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.8rem', color:'var(--text3)' }}>
                {completedCount}/{milestones.length} milestones completed
              </span>
              <span style={{ fontSize:'0.8rem', color:'var(--green)', fontWeight:600 }}>{pct}%</span>
            </div>
          </div>

          {/* Milestones */}
          <div className={styles.milestonesSection}>
            <h2 className={styles.sectionTitle}>Milestones</h2>
            <div className={styles.milestonesList}>
              {milestones.map((m, i) => (
                <MilestoneItem
                  key={i}
                  milestone={m}
                  index={i}
                  campaignAddress={address}
                  isNGO={isNGO}
                  onRefresh={load}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────── */}
        <div className={styles.sidebar}>
          {/* Donate card */}
          {Number(summary.cStatus) === 0 && !isNGO && !isOwner && (
            <div className={`card ${styles.donateCard}`}>
              <h3 className={styles.donateTitle}>Make a Donation</h3>
              <p className={styles.donateSub}>
                Funds are held in escrow and released only when milestones are verified.
              </p>
              <div className={styles.donateInput}>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.001"
                  value={ethAmount}
                  onChange={e => setEthAmount(e.target.value)}
                />
                <span className={styles.ethLabel}>ETH</span>
              </div>
              <div className={styles.quickAmounts}>
                {['0.01', '0.05', '0.1', '0.5'].map(a => (
                  <button key={a} className={`btn btn-ghost btn-sm ${styles.quickBtn}`} onClick={() => setEthAmount(a)}>
                    {a}
                  </button>
                ))}
              </div>
              {!account ? (
                <p className={styles.connectNote}>Connect wallet to donate</p>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width:'100%' }}
                  onClick={handleDonate}
                  disabled={donating}
                >
                  {donating ? <span className="spinner" style={{width:16,height:16}} /> : '💚'}
                  {donating ? 'Processing…' : 'Donate Now'}
                </button>
              )}
              {myDonated > 0n && (
                <p className={styles.myDonation}>
                  You've donated {formatEthShort(myDonated)} total
                </p>
              )}
            </div>
          )}

          {/* Campaign info */}
          <div className="card">
            <h3 className={styles.infoTitle}>Campaign Info</h3>
            <div className={styles.infoList}>
              {[
                ['Goal',       formatEthShort(summary.goal)],
                ['Released',   formatEthShort(summary.released)],
                ['Balance',    formatEthShort(summary.balance)],
                ['Deadline',   formatDate(summary.dline)],
                ['Milestones', `${summary.milestoneCount}`],
              ].map(([k, v]) => (
                <div key={k} className={styles.infoRow}>
                  <span className={styles.infoKey}>{k}</span>
                  <span className={styles.infoVal}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NGO address */}
          <div className="card">
            <h3 className={styles.infoTitle}>Organisation</h3>
            <p className={styles.ngoFull}>{summary.ngoAddr}</p>
            <a
              href={`https://sepolia.etherscan.io/address/${summary.ngoAddr}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.etherscanLink}
            >
              View on Etherscan ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
