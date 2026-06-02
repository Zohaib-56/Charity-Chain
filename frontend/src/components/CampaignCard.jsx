import React from 'react'
import { Link } from 'react-router-dom'
import { formatEthShort, progressPercent, timeLeft, CAMPAIGN_STATUS, CATEGORY_ICONS } from '../utils/helpers'
import styles from './CampaignCard.module.css'

export default function CampaignCard({ address, summary, index }) {
  if (!summary) return null

  const { title, cat, goal, donated, dline, cStatus, milestoneCount } = summary
  const pct    = progressPercent(donated, goal)
  const status = CAMPAIGN_STATUS[Number(cStatus)] || CAMPAIGN_STATUS[0]
  const icon   = CATEGORY_ICONS[cat] || '💛'

  return (
    <Link to={`/campaign/${address}`} className={styles.card} style={{ animationDelay: `${index * 0.06}s` }}>
      <div className={styles.top}>
        <div className={styles.iconWrap}>{icon}</div>
        <div className={styles.badges}>
          <span className={`badge ${status.color}`}>{status.label}</span>
          <span className="badge badge-gray">{cat}</span>
        </div>
      </div>

      <h3 className={styles.title}>{title}</h3>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{formatEthShort(donated)}</span>
          <span className={styles.statLabel}>raised of {formatEthShort(goal)}</span>
        </div>
        <div className={styles.stat} style={{ textAlign: 'right' }}>
          <span className={styles.statVal}>{pct}%</span>
          <span className={styles.statLabel}>funded</span>
        </div>
      </div>

      <div className="progress-bar" style={{ margin: '0.25rem 0 1rem' }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.footer}>
        <span className={styles.meta}>⬡ {milestoneCount?.toString()} milestones</span>
        <span className={styles.meta}>⏱ {timeLeft(dline)}</span>
      </div>
    </Link>
  )
}
