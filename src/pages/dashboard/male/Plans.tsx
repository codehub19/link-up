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

type Payment = {
  id: string
  uid: string
  planId: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'failed'
  updatedAt?: any
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
  // - activeByPlan: true when some subscription for that plan is active AND remainingMatches > 0 AND roundsUsed < roundsAllowed
  // - expiredByPlan: true when any subscription for that plan is expired OR remainingMatches <= 0 OR roundsUsed >= roundsAllowed
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

  // Track payment status for the user per plan (pending/approved/rejected/failed)
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

  // Track subscriptions per plan with remainingMatches and roundsAllowed consideration
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
        const roundsAllowed = Number(d.roundsAllowed ?? 1) // use default if missing

        const isActiveNow = status === 'active' && remaining > 0 && roundsUsed < roundsAllowed
        if (isActiveNow) activeMap[key] = true

        // Mark expired if explicitly expired OR active but 0 remaining OR roundsUsed >= roundsAllowed
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
      .catch(e => {});
  }, [user, sub]);

  const choose = (p: any) => {
    nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${Number(p.price || p.amount || 0)}`)
  }

  const statusChip = (planId: string) => {
    const key = slug(planId)
    const isActive = activeByPlan[key] === true
    const isExpired = expiredByPlan[key] === true
    const pay = paymentStatusByPlan[key]

    if (isActive) return <span className="tag" style={{ background: '#DCFCE7', color: '#166534' }}>Active</span>
    if (pay === 'pending') return <span className="tag" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>
    if (pay === 'rejected') return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Rejected</span>
    if (pay === 'failed') return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Failed</span>
    if (isExpired) return <span className="tag" style={{ background: '#F3F4F6', color: '#374151' }}>Expired</span>
    return null
  }

  // Add rounds info to banner if plan exists
  const roundsInfo = sub?.plan?.roundsAllowed
    ? ` • Rounds allowed: ${sub.plan.roundsAllowed} • Rounds used: ${sub.roundsUsed ?? 0}`
    : ''

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />

        {sub ? (
          <div className="banner" style={{ marginBottom: 16 }}>
            Current plan: <b>{sub.plan?.name ?? sub.planId}</b> • Remaining matches: <b>{sub.remainingMatches}</b>
            {roundsInfo}
            {sub.plan?.supportAvailable ? <span style={{ marginLeft: 12 }}>Support included</span> : null}
            <button className="btn primary" style={{ marginLeft: 12 }} onClick={() => nav('/dashboard/matches')}>
              Go to Matches
            </button>
          </div>
        ) : (
          <div className="banner ghost" style={{ marginBottom: 16 }}>
            No active plan. Choose a plan below to join the next round.
          </div>
        )}

        <h2>Available Plans</h2>
        {loading ? (
          <div>Loading…</div>
        ) : plans.length === 0 ? (
          <div className="empty">No active plans right now. Please check back later.</div>
        ) : (
          <div className="grid cols-3">
            {plans.map((p) => {
              const key = slug(p.id)
              const isActive = activeByPlan[key] === true
              const isPending = paymentStatusByPlan[key] === 'pending'
              const isExpired = expiredByPlan[key] === true

              const matchCount = (p.matchQuota ?? p.quota ?? 1)
              const roundsAllowed = (p.roundsAllowed ?? 1)

              // CTA rules:
              // - Active sub → Go to Matches
              // - Pending payment → Awaiting approval (disabled)
              // - Otherwise → Buy again (if expired) or Choose plan
              const btnLabel = isActive
                ? 'Go to Matches'
                : isPending
                ? 'Awaiting approval'
                : isExpired
                ? 'Buy again'
                : 'Choose plan'

              const btnAction = isActive ? () => nav('/dashboard/matches') : () => choose(p)

              return (
                <div key={p.id} className="card plan">
                  <div className="card-body">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>{p.name}</h3>
                      {statusChip(p.id)}
                    </div>
                    <div className="price">₹{p.price ?? p.amount}</div>
                    <p className="muted">Includes {matchCount} match{matchCount > 1 ? 'es' : ''} • Up to {roundsAllowed} round{roundsAllowed > 1 ? 's' : ''}</p>
                    {Array.isArray(p.offers) && p.offers.length ? (
                      <ul style={{ marginLeft: 16 }}>
                        {p.offers.map((o: string) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    ) : null}
                    {p.supportAvailable ? <div className="tag" style={{ marginTop: 8 }}>Support included</div> : null}
                  </div>
                  <div className="card-footer">
                    <button className={`btn ${isActive ? '' : 'btn-primary'}`} onClick={btnAction} disabled={isPending}>
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