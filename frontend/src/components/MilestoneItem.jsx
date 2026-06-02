import React, { useState } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { CAMPAIGN_ABI } from '../abi/contracts'
import { useWeb3 } from '../context/Web3Context'
import { formatEthShort, formatDate, MILESTONE_STATUS } from '../utils/helpers'
import styles from './MilestoneItem.module.css'

export default function MilestoneItem({ milestone, index, campaignAddress, isNGO, onRefresh }) {
  const { signer, factoryContract, isOwner, account } = useWeb3()
  const [ipfsHash,   setIpfsHash]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [approving,  setApproving]  = useState(false)
  const [expanded,   setExpanded]   = useState(false)

  const status    = MILESTONE_STATUS[Number(milestone.status)] || MILESTONE_STATUS[0]
  const statusNum = Number(milestone.status)

  const handleSubmitProof = async () => {
    if (!ipfsHash.trim()) return toast.error('Please enter an IPFS hash')
    setSubmitting(true)
    try {
      const campaign = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, signer)
      const tx = await campaign.submitMilestoneProof(index, ipfsHash.trim())
      toast.loading('Submitting proof…', { id: 'proof' })
      await tx.wait()
      toast.success('Proof submitted!', { id: 'proof' })
      setIpfsHash('')
      onRefresh?.()
    } catch (err) {
      toast.error(err.reason || err.message?.slice(0, 80) || 'Transaction failed', { id: 'proof' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      const tx = await factoryContract.approveMilestone(campaignAddress, index)
      toast.loading('Approving milestone…', { id: 'approve' })
      await tx.wait()
      toast.success('Milestone approved — funds released!', { id: 'approve' })
      onRefresh?.()
    } catch (err) {
      toast.error(err.reason || 'Approval failed', { id: 'approve' })
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    try {
      const tx = await factoryContract.rejectMilestone(campaignAddress, index, reason)
      toast.loading('Rejecting…', { id: 'reject' })
      await tx.wait()
      toast.success('Milestone rejected', { id: 'reject' })
      onRefresh?.()
    } catch (err) {
      toast.error(err.reason || 'Rejection failed', { id: 'reject' })
    }
  }

  return (
    <div className={`${styles.item} ${styles[`status${statusNum}`]}`}>
      <div className={styles.header} onClick={() => setExpanded(v => !v)}>
        <div className={styles.left}>
          <div className={`${styles.indexBadge} ${statusNum === 2 ? styles.done : ''}`}>
            {statusNum === 2 ? '✓' : index + 1}
          </div>
          <div>
            <div className={styles.title}>{milestone.title}</div>
            <div className={styles.amount}>{formatEthShort(milestone.targetAmount)}</div>
          </div>
        </div>
        <div className={styles.right}>
          <span className={`badge ${status.color}`}>{status.label}</span>
          <span className={styles.chevron}>{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      {expanded && (
        <div className={styles.body}>
          <p className={styles.desc}>{milestone.description}</p>

          {/* Proof hash display */}
          {milestone.proofIPFSHash && (
            <div className={styles.proof}>
              <span className={styles.proofLabel}>IPFS Proof</span>
              <a
                href={`https://ipfs.io/ipfs/${milestone.proofIPFSHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.proofLink}
              >
                {milestone.proofIPFSHash.slice(0, 20)}…{milestone.proofIPFSHash.slice(-8)}
                <span> ↗</span>
              </a>
            </div>
          )}

          {milestone.completedAt > 0 && (
            <div className={styles.completedDate}>
              Released on {formatDate(milestone.completedAt)}
            </div>
          )}

          {/* NGO: submit proof */}
          {isNGO && statusNum === 0 && (
            <div className={styles.action}>
              <input
                placeholder="IPFS hash (e.g. QmXoypiz…)"
                value={ipfsHash}
                onChange={e => setIpfsHash(e.target.value)}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmitProof}
                disabled={submitting}
              >
                {submitting ? <span className="spinner" style={{width:14,height:14}} /> : null}
                {submitting ? 'Submitting…' : 'Submit Proof'}
              </button>
            </div>
          )}

          {/* Admin: approve / reject */}
          {isOwner && statusNum === 1 && (
            <div className={styles.adminActions}>
              <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={approving}>
                {approving ? <span className="spinner" style={{width:14,height:14}} /> : '✓'}
                {approving ? 'Approving…' : 'Approve & Release Funds'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleReject}>
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
