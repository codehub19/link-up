import Navbar from '../../../components/Navbar'
import MaleTabs from '../../../components/MaleTabs'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { toast } from 'sonner'
import { listActivePlans, getActiveSubscription, type ActiveSubscription } from '../../../services/subscriptions'

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

  // slug(planId) -> latest status
  const [paymentStatusByPlan, setPaymentStatusByPlan] = useState<Record<string, Payment['status']>>({})

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

  const choose = (p: any) => {
    nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${Number(p.price || p.amount || 0)}`)
  }

  const statusChip = (planId: string) => {
    const st = paymentStatusByPlan[slug(planId)]
    if (!st) return null
    if (st === 'pending') return <span className="tag" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>
    if (st === 'approved') return <span className="tag" style={{ background: '#DCFCE7', color: '#166534' }}>Confirmed</span>
    if (st === 'rejected') return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Rejected</span>
    if (st === 'failed') return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Failed</span>
    return null
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />

        {sub ? (
          <div className="banner" style={{ marginBottom: 16 }}>
            Current plan: <b>{sub.plan?.name ?? sub.planId}</b> • Remaining matches: <b>{sub.remainingMatches}</b>
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
              const st = paymentStatusByPlan[slug(p.id)]
              const isPending = st === 'pending'
              const isApproved = st === 'approved'

              return (
                <div key={p.id} className="card plan">
                  <div className="card-body">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>{p.name}</h3>
                      {statusChip(p.id)}
                    </div>
                    <div className="price">₹{p.price ?? p.amount}</div>
                    <p className="muted">Includes {(p.matchQuota ?? p.quota ?? 1)} match{(p.matchQuota ?? p.quota ?? 1) > 1 ? 'es' : ''}</p>
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
                    {isApproved ? (
                      <button className="btn" onClick={() => nav('/dashboard/matches')}>Go to Matches</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => choose(p)} disabled={isPending}>
                        {isPending ? 'Awaiting approval' : 'Choose plan'}
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