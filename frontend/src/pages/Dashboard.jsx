import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { CAMPAIGN_ABI } from '../abi/contracts'
import { formatEthShort, progressPercent, CAMPAIGN_STATUS } from '../utils/helpers'
import styles from './Dashboard.module.css'

const EMPTY_CAMPAIGN = {
  title: '', description: '', category: 'Disaster Relief',
  goalEth: '', durationDays: '90',
  milestones: [{ title: '', description: '', ethAmount: '' }],
}

export default function Dashboard() {
  const { account, factoryContract, signer, ngoInfo, isOwner, refreshNgoInfo } = useWeb3()
  const [tab,          setTab]          = useState('campaigns')
  const [campaigns,    setCampaigns]    = useState([])
  const [summaries,    setSummaries]    = useState({})
  const [loading,      setLoading]      = useState(false)
  const [form,         setForm]         = useState(EMPTY_CAMPAIGN)
  const [creating,     setCreating]     = useState(false)
  // NGO registration
  const [regForm,      setRegForm]      = useState({ name:'', regNumber:'', ipfsHash:'' })
  const [registering,  setRegistering]  = useState(false)
  // Admin
  const [allNGOs,      setAllNGOs]      = useState([])

  useEffect(() => {
    if (account && factoryContract) loadData()
  }, [account, factoryContract])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isOwner) {
        const ngos = await factoryContract.getAllNGOs()
        setAllNGOs(ngos)
        const allCampaigns = await factoryContract.getAllCampaigns()
        setCampaigns(allCampaigns)
        loadSummaries(allCampaigns)
      } else if (ngoInfo?.isRegistered) {
        const ids  = await factoryContract.getNGOCampaigns(account)
        const addrs = await Promise.all(ids.map(id => factoryContract.getCampaignAddress(id)))
        setCampaigns(addrs)
        loadSummaries(addrs)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadSummaries = async (addrs) => {
    const _provider = signer?.provider
    if (!_provider) return
    const results = await Promise.allSettled(
      addrs.map(addr => new ethers.Contract(addr, CAMPAIGN_ABI, _provider).getCampaignSummary())
    )
    const map = {}
    results.forEach((r, i) => { if (r.status === 'fulfilled') map[addrs[i]] = r.value })
    setSummaries(map)
  }

  // ── Create campaign ──────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title || !form.goalEth || form.milestones.some(m => !m.title || !m.ethAmount))
      return toast.error('Please fill all required fields')

    const goalWei     = ethers.parseEther(form.goalEth)
    const msAmounts   = form.milestones.map(m => ethers.parseEther(m.ethAmount))
    const msSum       = msAmounts.reduce((a, b) => a + b, 0n)
    if (msSum !== goalWei) return toast.error('Milestone amounts must sum to the goal amount')

    setCreating(true)
    try {
      const tx = await factoryContract.createCampaign(
        form.title, form.description, form.category,
        goalWei, Number(form.durationDays),
        form.milestones.map(m => m.title),
        form.milestones.map(m => m.description),
        msAmounts
      )
      toast.loading('Deploying campaign…', { id: 'create' })
      await tx.wait()
      toast.success('Campaign created!', { id: 'create' })
      setForm(EMPTY_CAMPAIGN)
      loadData()
      setTab('campaigns')
    } catch (err) {
      toast.error(err.reason || err.message?.slice(0, 80) || 'Failed', { id: 'create' })
    } finally { setCreating(false) }
  }

  // ── Register NGO ─────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regForm.name) return toast.error('Organisation name is required')
    setRegistering(true)
    try {
      const tx = await factoryContract.registerNGO(regForm.name, regForm.regNumber, regForm.ipfsHash)
      toast.loading('Registering…', { id: 'reg' })
      await tx.wait()
      toast.success('Registration submitted! Awaiting admin verification.', { id: 'reg' })
      refreshNgoInfo()
    } catch (err) {
      toast.error(err.reason || 'Registration failed', { id: 'reg' })
    } finally { setRegistering(false) }
  }

  // ── Admin: verify / revoke NGO ───────────────────────────────
  const handleVerify = async (ngoAddr) => {
    try {
      const tx = await factoryContract.verifyNGO(ngoAddr)
      toast.loading('Verifying…', { id: ngoAddr })
      await tx.wait()
      toast.success('NGO verified!', { id: ngoAddr })
      loadData()
    } catch (err) { toast.error(err.reason || 'Failed', { id: ngoAddr }) }
  }
  const handleRevoke = async (ngoAddr) => {
    try {
      const tx = await factoryContract.revokeNGO(ngoAddr)
      await tx.wait()
      toast.success('NGO revoked')
      loadData()
    } catch (err) { toast.error(err.reason || 'Failed') }
  }

  // ── Milestone helpers ────────────────────────────────────────
  const addMilestone = () =>
    setForm(f => ({ ...f, milestones: [...f.milestones, { title:'', description:'', ethAmount:'' }] }))

  const updateMilestone = (i, key, val) =>
    setForm(f => ({ ...f, milestones: f.milestones.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }))

  const removeMilestone = (i) =>
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }))

  if (!account) return (
    <div className="page">
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔗</div>
        <h2>Connect your wallet</h2>
        <p>You need a connected wallet to access the dashboard</p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{isOwner ? 'Admin Dashboard' : 'NGO Dashboard'}</h1>
            <p className={styles.pageSub}>
              {isOwner ? 'Manage NGOs and verify milestones' : ngoInfo?.name || 'Manage your campaigns'}
            </p>
          </div>
          {ngoInfo?.isVerified && !isOwner && (
            <button className="btn btn-primary" onClick={() => setTab('create')}>+ New Campaign</button>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'campaigns' ? styles.active : ''}`} onClick={() => setTab('campaigns')}>
            {isOwner ? 'All Campaigns' : 'My Campaigns'}
          </button>
          {isOwner && (
            <button className={`${styles.tab} ${tab === 'ngos' ? styles.active : ''}`} onClick={() => setTab('ngos')}>
              NGO Registry ({allNGOs.length})
            </button>
          )}
          {ngoInfo?.isVerified && !isOwner && (
            <button className={`${styles.tab} ${tab === 'create' ? styles.active : ''}`} onClick={() => setTab('create')}>
              Create Campaign
            </button>
          )}
          {!ngoInfo?.isRegistered && !isOwner && (
            <button className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`} onClick={() => setTab('register')}>
              Register as NGO
            </button>
          )}
        </div>

        {/* ── Campaigns tab ──────────────────────────────────── */}
        {tab === 'campaigns' && (
          <div className={styles.tabContent}>
            {/* Pending verification notice */}
            {ngoInfo?.isRegistered && !ngoInfo?.isVerified && (
              <div className={styles.notice}>
                <span>⏳</span>
                <div>
                  <strong>Verification pending</strong>
                  <p>Your NGO registration is awaiting admin approval. You'll be able to create campaigns once verified.</p>
                </div>
              </div>
            )}
            {loading ? (
              <div className={styles.loading}><span className="spinner" style={{width:32,height:32}} /></div>
            ) : campaigns.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📋</div>
                <h3>No campaigns yet</h3>
                {ngoInfo?.isVerified && <button className="btn btn-primary" onClick={() => setTab('create')}>Create your first campaign</button>}
              </div>
            ) : (
              <div className={styles.campaignList}>
                {campaigns.map(addr => {
                  const s = summaries[addr]
                  const status = s ? CAMPAIGN_STATUS[Number(s.cStatus)] : null
                  return (
                    <div key={addr} className={styles.campaignRow}>
                      <div className={styles.campaignRowLeft}>
                        <div className={styles.campaignRowTitle}>{s?.title || addr}</div>
                        <div className={styles.campaignRowSub}>
                          {s && <>{formatEthShort(s.donated)} / {formatEthShort(s.goal)}</>}
                        </div>
                        {s && (
                          <div className="progress-bar" style={{ width:200, marginTop:'0.4rem' }}>
                            <div className="progress-fill" style={{ width:`${progressPercent(s.donated, s.goal)}%` }} />
                          </div>
                        )}
                      </div>
                      <div className={styles.campaignRowRight}>
                        {status && <span className={`badge ${status.color}`}>{status.label}</span>}
                        <Link to={`/campaign/${addr}`} className="btn btn-ghost btn-sm">View →</Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── NGOs tab (admin) ───────────────────────────────── */}
        {tab === 'ngos' && isOwner && (
          <div className={styles.tabContent}>
            {allNGOs.length === 0 ? (
              <div className={styles.empty}><p>No NGOs registered yet</p></div>
            ) : (
              <div className={styles.ngoList}>
                {allNGOs.map(addr => (
                  <NGORowSync key={addr} addr={addr} factoryContract={factoryContract} onVerify={handleVerify} onRevoke={handleRevoke} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Create campaign tab ───────────────────────────── */}
        {tab === 'create' && ngoInfo?.isVerified && (
          <div className={styles.tabContent}>
            <form className={styles.createForm} onSubmit={handleCreate}>
              <h2 className={styles.formTitle}>New Campaign</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Campaign Title *</label>
                  <input placeholder="e.g. Flood Relief 2024" value={form.title}
                    onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                    {['Disaster Relief','Healthcare','Education','Food','Shelter','Environment','Other'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} placeholder="Describe the campaign and its impact…"
                  value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  style={{ resize:'vertical' }} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Goal Amount (ETH) *</label>
                  <input type="number" min="0" step="0.001" placeholder="e.g. 3.0"
                    value={form.goalEth} onChange={e => setForm(f => ({...f, goalEth: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (days) *</label>
                  <input type="number" min="1" placeholder="90"
                    value={form.durationDays} onChange={e => setForm(f => ({...f, durationDays: e.target.value}))} required />
                </div>
              </div>

              {/* Milestones */}
              <div className={styles.milestonesForm}>
                <div className={styles.milestonesFormHeader}>
                  <h3 className={styles.milestonesFormTitle}>Milestones *</h3>
                  <span className={styles.milestonesHint}>Must sum to {form.goalEth || '0'} ETH</span>
                </div>
                {form.milestones.map((m, i) => (
                  <div key={i} className={styles.milestoneFormRow}>
                    <div className={styles.milestoneFormIndex}>{i+1}</div>
                    <div className={styles.milestoneFormFields}>
                      <div className="form-grid">
                        <input placeholder="Milestone title *" value={m.title}
                          onChange={e => updateMilestone(i, 'title', e.target.value)} />
                        <input type="number" placeholder="ETH amount *" min="0" step="0.001"
                          value={m.ethAmount} onChange={e => updateMilestone(i, 'ethAmount', e.target.value)} />
                      </div>
                      <input placeholder="Description" value={m.description}
                        onChange={e => updateMilestone(i, 'description', e.target.value)} style={{ marginTop:'0.5rem' }} />
                    </div>
                    {form.milestones.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeMilestone(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addMilestone} style={{ width:'100%' }}>
                  + Add Milestone
                </button>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={creating}>
                {creating ? <span className="spinner" style={{width:18,height:18}} /> : '⬡'}
                {creating ? 'Deploying to blockchain…' : 'Create Campaign'}
              </button>
            </form>
          </div>
        )}

        {/* ── Register NGO tab ──────────────────────────────── */}
        {tab === 'register' && !ngoInfo?.isRegistered && (
          <div className={styles.tabContent}>
            <form className={styles.createForm} onSubmit={handleRegister}>
              <h2 className={styles.formTitle}>Register as NGO</h2>
              <p className={styles.formSubtitle}>
                Submit your organisation details. The platform admin will verify your registration before you can create campaigns.
              </p>
              <div className="form-group">
                <label className="form-label">Organisation Name *</label>
                <input placeholder="e.g. Hope Relief Foundation" value={regForm.name}
                  onChange={e => setRegForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input placeholder="Official charity registration number" value={regForm.regNumber}
                  onChange={e => setRegForm(f => ({...f, regNumber: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">IPFS Profile Hash</label>
                <input placeholder="IPFS CID of your organisation documents (optional)" value={regForm.ipfsHash}
                  onChange={e => setRegForm(f => ({...f, ipfsHash: e.target.value}))} />
                <span className="form-hint">Upload documents to IPFS via Pinata and paste the CID here</span>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={registering}>
                {registering ? <span className="spinner" style={{width:18,height:18}} /> : null}
                {registering ? 'Submitting…' : 'Submit Registration'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

// ── NGO Row sub-component ────────────────────────────────────────
function NGORowSync({ addr, factoryContract, onVerify, onRevoke }) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    factoryContract.getNGOInfo(addr).then(setInfo).catch(() => {})
  }, [addr])
  if (!info) return null
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:'0.5rem' }}>
      <div>
        <div style={{ fontWeight:500 }}>{info.name || 'Unknown'}</div>
        <div style={{ fontSize:'0.78rem', color:'var(--text3)', fontFamily:'monospace' }}>{addr}</div>
        {info.registrationNumber && <div style={{ fontSize:'0.78rem', color:'var(--text3)' }}>Reg: {info.registrationNumber}</div>}
      </div>
      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
        {info.isVerified
          ? <><span className="badge badge-green">Verified</span><button className="btn btn-danger btn-sm" onClick={() => onRevoke(addr)}>Revoke</button></>
          : <><span className="badge badge-amber">Pending</span><button className="btn btn-primary btn-sm" onClick={() => onVerify(addr)}>Verify</button></>
        }
      </div>
    </div>
  )
}
