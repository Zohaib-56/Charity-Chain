import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import { CAMPAIGN_ABI } from '../abi/contracts'
import CampaignCard from '../components/CampaignCard'
import styles from './Campaigns.module.css'

const CATEGORIES = ['All', 'Disaster Relief', 'Healthcare', 'Education', 'Food', 'Shelter', 'Environment', 'Other']

export default function Campaigns() {
  const { factoryContract, provider, account } = useWeb3()
  const [campaigns,  setCampaigns]  = useState([])
  const [summaries,  setSummaries]  = useState({})
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('All')
  const [search,     setSearch]     = useState('')

  useEffect(() => {
    if (factoryContract) loadCampaigns()
  }, [factoryContract])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const addrs = await factoryContract.getAllCampaigns()
      setCampaigns(addrs)

      // Load summaries in parallel
      const _provider = provider || new ethers.JsonRpcProvider('http://127.0.0.1:8545')
      const results = await Promise.allSettled(
        addrs.map(addr => {
          const c = new ethers.Contract(addr, CAMPAIGN_ABI, _provider)
          return c.getCampaignSummary()
        })
      )
      const map = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map[addrs[i]] = r.value
      })
      setSummaries(map)
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = campaigns.filter(addr => {
    const s = summaries[addr]
    if (!s) return true
    if (filter !== 'All' && s.cat !== filter) return false
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Active Campaigns</h1>
            <p className={styles.sub}>
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} on-chain
            </p>
          </div>
          <input
            className={styles.search}
            placeholder="Search campaigns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className={styles.filters}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        {!account ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔗</div>
            <h3>Connect your wallet</h3>
            <p>Connect MetaMask to browse and interact with campaigns</p>
          </div>
        ) : loading ? (
          <div className={styles.loading}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <p>Loading campaigns from blockchain…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌱</div>
            <h3>No campaigns found</h3>
            <p>{campaigns.length === 0 ? 'No campaigns have been created yet.' : 'Try adjusting your search or filter.'}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((addr, i) => (
              <CampaignCard
                key={addr}
                address={addr}
                summary={summaries[addr]}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
