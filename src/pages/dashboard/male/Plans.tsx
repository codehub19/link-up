import Navbar from '../../../components/Navbar'
import MaleTabs from '../../../components/MaleTabs'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { toast } from 'sonner'
import { listActivePlans, getActiveSubscription, type ActiveSubscription } from '../../../services/subscriptions'
import { addMaleToActiveRound } from '../../../services/rounds'
import './Plans.styles.css'
import HomeBackground from '../../../components/home/HomeBackground'
import { createSupportQuery, SUPPORT_CATEGORIES } from '../../../services/support'

type Payment = {
  id: string
  uid: string
  planId: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'failed'
  updatedAt?: any
}

// Helper icons
function CheckIcon() {
  return (
    <svg className="check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function slug(s: string) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')      // spaces/underscores → hyphen
    .replace(/[^a-z0-9-]/g, '')   // drop other punctuation
}

export default function MalePlans() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [plans, setPlans] = useState<any[]>([])
  const [sub, setSub] = useState<ActiveSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  // slug(planId) -> latest payment status
  const [paymentStatusByPlan, setPaymentStatusByPlan] = useState<Record<string, Payment['status']>>({})

  // Subscriptions view:
  const [activeByPlan, setActiveByPlan] = useState<Record<string, boolean>>({})
  const [expiredByPlan, setExpiredByPlan] = useState<Record<string, boolean>>({})

  // Support Modal State
  const [showSupport, setShowSupport] = useState(false)
  const [supportPlan, setSupportPlan] = useState<string | null>(null)
  const [supportCategory, setSupportCategory] = useState(SUPPORT_CATEGORIES[0])
  const [supportMessage, setSupportMessage] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const [pl, s] = await Promise.all([
          listActivePlans(),
          user ? getActiveSubscription(user.uid) : Promise.resolve(null),
        ])
        setPlans(pl)
        setSub(s)
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to load plans')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  // Track payment status for the user per plan
  useEffect(() => {
    if (!user) return
    const qy = query(collection(db, 'payments'), where('uid', '==', user.uid))
    const un = onSnapshot(qy, (snap) => {
      const latestByPlan: Record<string, { status: Payment['status']; ts: number }> = {}
      snap.forEach((doc) => {
        const d = doc.data() as any
        const rawId = (d.planId || '') as string
        if (!rawId) return
        const key = slug(rawId)
        const status = (d.status ?? 'pending') as Payment['status']
        const ts = d.updatedAt?.toMillis?.() ?? Date.now()
        if (!latestByPlan[key] || ts > latestByPlan[key].ts) {
          latestByPlan[key] = { status, ts }
        }
      })
      const out: Record<string, Payment['status']> = {}
      Object.keys(latestByPlan).forEach((k) => (out[k] = latestByPlan[k].status))
      setPaymentStatusByPlan(out)
    })
    return () => un()
  }, [user])

  // Track subscriptions per plan
  useEffect(() => {
    if (!user) return
    const qy = query(collection(db, 'subscriptions'), where('uid', '==', user.uid))
    const un = onSnapshot(qy, (snap) => {
      const activeMap: Record<string, boolean> = {}
      const expiredMap: Record<string, boolean> = {}

      snap.forEach((doc) => {
        const d = doc.data() as any
        const key = slug(d.planId || '')
        if (!key) return
        const remaining = Number(d.remainingMatches ?? 0)
        const status = String(d.status ?? 'active')
        const roundsUsed = Number(d.roundsUsed ?? 0)
        const roundsAllowed = Number(d.roundsAllowed ?? 1)

        const isActiveNow = status === 'active' && remaining > 0 && roundsUsed < roundsAllowed
        if (isActiveNow) activeMap[key] = true

        if (status === 'expired' || (status === 'active' && (remaining <= 0 || roundsUsed >= roundsAllowed))) {
          expiredMap[key] = true
        }
      })

      setActiveByPlan(activeMap)
      setExpiredByPlan(expiredMap)
    })
    return () => un()
  }, [user])


  useEffect(() => {
    if (!user || !sub) return;
    addMaleToActiveRound(user.uid)
      .catch(e => { });
  }, [user, sub]);

  const choose = (p: any) => {
    // Calculate potential discount
    const original = Number(p.price || p.amount || 0)
    const discount = Number(p.discountPercent || 0)
    const finalPrice = discount > 0 ? Math.round(original * (1 - discount / 100)) : original

    nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${finalPrice}`)
  }

  const getStatusBadge = (planId: string) => {
    const key = slug(planId)
    const isActive = activeByPlan[key] === true
    const isExpired = expiredByPlan[key] === true
    const pay = paymentStatusByPlan[key]

    if (isActive) return <span className="status-badge active">Active</span>
    if (pay === 'pending') return <span className="status-badge pending">Pending</span>
    if (pay === 'rejected') return <span className="status-badge failed">Rejected</span>
    if (pay === 'failed') return <span className="status-badge failed">Failed</span>
    if (isExpired) return <span className="status-badge expired">Expired</span>
    return null
  }

  const handleSupport = (planId: string) => {
    setSupportPlan(planId)
    setSupportCategory('Other')
    setSupportMessage('')
    setShowSupport(true)
  }

  const wordCount = supportMessage.trim().split(/\s+/).filter(Boolean).length
  const isOverLimit = wordCount > 30

  const submitSupport = async () => {
    if (!user || !supportPlan || !supportMessage.trim() || isOverLimit) return
    setSubmittingSupport(true)
    try {
      await createSupportQuery({
        uid: user.uid,
        planId: supportPlan,
        category: supportCategory,
        message: supportMessage
      })
      toast.success('Query sent! Check your profile for updates.')
      setShowSupport(false)
    } catch (e) {
      console.error(e)
      toast.error('Failed to send query')
    } finally {
      setSubmittingSupport(false)
    }
  }

  return (
    <>
      <HomeBackground />
      <Navbar />

      {/* Support Modal */}
      {showSupport && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowSupport(false)}>
          <div className="modal-content" style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 16,
            padding: 24, width: '90%', maxWidth: 400, color: 'white'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Premium Support</h3>
            <p style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>
              Have an issue with your active plan? Let us know.
            </p>

            <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Issue Type</label>
            <select
              value={supportCategory}
              onChange={e => setSupportCategory(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: '#262626', border: '1px solid #444', color: 'white',
                marginBottom: 16, outline: 'none'
              }}
            >
              {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Message</label>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={e => setSupportMessage(e.target.value)}
              placeholder="Describe your issue (max 30 words)..."
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: '#262626', border: `1px solid ${isOverLimit ? '#ef4444' : '#444'}`,
                color: 'white',
                marginBottom: 8, outline: 'none', resize: 'vertical'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: isOverLimit ? '#ef4444' : '#666', marginBottom: 24 }}>
              {wordCount}/30 words
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSupport(false)}
                style={{
                  background: 'transparent', border: 'none', color: '#aaa',
                  cursor: 'pointer', padding: '8px 16px'
                }}
              >
                Cancel
              </button>
              <button
                disabled={submittingSupport || isOverLimit || wordCount === 0}
                onClick={submitSupport}
                style={{
                  background: 'white', color: 'black', border: 'none',
                  borderRadius: 20, padding: '8px 20px', fontWeight: 600,
                  cursor: (submittingSupport || isOverLimit || wordCount === 0) ? 'not-allowed' : 'pointer',
                  opacity: (submittingSupport || isOverLimit || wordCount === 0) ? 0.5 : 1
                }}
              >
                {submittingSupport ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        <MaleTabs />

        <div className="plans-hero">
          <h1 className="plans-title text-gradient">Choose Your Plan</h1>
          <p className="plans-subtitle">Unlock exclusive rounds and verified matches.</p>
        </div>

        {sub && (
          <div className="active-plan-banner">
            <div className="banner-content">
              <div className="banner-title">Current Membership</div>
              <div className="banner-details">
                <b>{sub.plan?.name ?? sub.planId}</b>
                <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                {sub.remainingMatches} Matches Remaining
                {sub.plan?.roundsAllowed && (
                  <>
                    <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                    {sub.plan.roundsAllowed - (sub.roundsUsed ?? 0)} Rounds Remaining
                  </>
                )}
              </div>
              {sub.plan?.supportAvailable && (
                <div style={{ marginTop: 4, fontSize: '0.85rem', color: '#34d399' }}>✓ Premium Support Included</div>
              )}
            </div>
            <div className="banner-actions">
              <button className="plan-btn plan-btn-primary" style={{ padding: '0.75rem 1.5rem', width: 'auto' }} onClick={() => nav('/dashboard/matches')}>
                Go to Matches
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="empty-state">No active plans available right now.</div>
        ) : (
          <div className="plans-grid">
            {plans.map((p) => {
              const key = slug(p.id)
              const isActive = activeByPlan[key] === true
              const isPending = paymentStatusByPlan[key] === 'pending'
              const isExpired = expiredByPlan[key] === true

              const hasAnyActive = Object.values(activeByPlan).some(v => v === true)
              const isBlocked = hasAnyActive && !isActive

              const matchCount = (p.matchQuota ?? p.quota ?? 1)
              const roundsAllowed = (p.roundsAllowed ?? 1)

              const btnLabel = isActive
                ? 'Current Plan'
                : isPending
                  ? 'Approval Pending'
                  : isExpired
                    ? 'Renew Plan'
                    : 'Select Plan'

              const btnAction = isActive ? () => nav('/dashboard/matches') : () => choose(p)

              const isFeatured = p.isFeatured || false; // Assume property or default

              return (
                <div key={p.id} className={`plan-card ${isActive ? 'featured' : ''}`}>
                  <div className="plan-header">
                    <div className="plan-name">{p.name}</div>
                    {getStatusBadge(p.id)}
                  </div>

                  <div className="plan-price-block">
                    {p.discountPercent > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span className="plan-price">₹{Math.round(p.price * (1 - p.discountPercent / 100))}</span>
                        <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>₹{p.price}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          transform: 'translateY(-4px)'
                        }}>
                          {p.discountPercent}% OFF
                        </span>
                      </div>
                    ) : (
                      <span className="plan-price">₹{p.price ?? p.amount}</span>
                    )}
                    {/* <span className="plan-period">/ month</span> (optional if recurring) */}
                  </div>

                  <ul className="plan-features">
                    <li className="plan-feature-item">
                      <CheckIcon />
                      <span>{matchCount} Verified Match{matchCount > 1 ? 'es' : ''}</span>
                    </li>
                    <li className="plan-feature-item">
                      <CheckIcon />
                      <span>Access to {roundsAllowed} Matching Round{roundsAllowed > 1 ? 's' : ''}</span>
                    </li>
                    {Array.isArray(p.offers) && p.offers.map((o: string) => (
                      <li key={o} className="plan-feature-item">
                        <CheckIcon />
                        <span>{o}</span>
                      </li>
                    ))}
                    {p.supportAvailable && (
                      <li className="plan-feature-item">
                        <CheckIcon />
                        <span>Priority Support</span>
                      </li>
                    )}
                  </ul>

                  <div className="plan-actions">
                    <button
                      className={`plan-btn ${isActive ? 'plan-btn-outline' : 'plan-btn-primary'}`}
                      style={isBlocked ? { opacity: 0.5, cursor: 'not-allowed', background: '#333', borderColor: '#444', color: '#aaa' } : {}}
                      onClick={() => {
                        if (isBlocked) {
                          toast.error("You can't purchase a new plan if a plan is active")
                          return
                        }
                        btnAction()
                      }}
                      disabled={isPending}
                    >
                      {btnLabel}
                    </button>
                    {isActive && p.supportAvailable && (
                      <button
                        className="plan-btn"
                        style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => handleSupport(p.id)}
                      >
                        Get Support / Help
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}