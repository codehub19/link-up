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
    nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${Number(p.price || p.amount || 0)}`)
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

  return (
    <>
      <HomeBackground />
      <Navbar />
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
                    <span className="plan-price">₹{p.price ?? p.amount}</span>
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
                      onClick={btnAction}
                      disabled={isPending}
                    >
                      {btnLabel}
                    </button>
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