import { ethers } from 'ethers'

export const formatEth = (wei) => {
  if (!wei) return '0'
  return parseFloat(ethers.formatEther(wei)).toFixed(4)
}

export const formatEthShort = (wei) => {
  if (!wei) return '0'
  const val = parseFloat(ethers.formatEther(wei))
  if (val >= 1) return val.toFixed(3) + ' ETH'
  return (val * 1000).toFixed(2) + ' mETH'
}

export const formatDate = (timestamp) => {
  if (!timestamp) return '—'
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export const timeLeft = (deadline) => {
  if (!deadline) return '—'
  const diff = Number(deadline) * 1000 - Date.now()
  if (diff <= 0) return 'Ended'
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export const progressPercent = (donated, goal) => {
  if (!goal || goal === 0n) return 0
  return Math.min(100, Math.round(Number((donated * 100n) / goal)))
}

export const shortAddress = (addr) => {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Milestone status
export const MILESTONE_STATUS = {
  0: { label: 'Pending',        color: 'badge-gray'  },
  1: { label: 'Proof Submitted',color: 'badge-amber' },
  2: { label: 'Completed',      color: 'badge-green' },
  3: { label: 'Rejected',       color: 'badge-red'   },
}

// Campaign status
export const CAMPAIGN_STATUS = {
  0: { label: 'Active',    color: 'badge-green' },
  1: { label: 'Paused',    color: 'badge-amber' },
  2: { label: 'Completed', color: 'badge-blue'  },
  3: { label: 'Cancelled', color: 'badge-red'   },
}

export const CATEGORY_ICONS = {
  'Disaster Relief': '🌊',
  'Healthcare':      '🏥',
  'Education':       '📚',
  'Food':            '🌾',
  'Shelter':         '🏠',
  'Environment':     '🌱',
  'Other':           '💛',
}
