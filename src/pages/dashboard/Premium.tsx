import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import FemaleTabs from '../../components/FemaleTabs'
import MaleTabs from '../../components/MaleTabs'
import { useAuth } from '../../state/AuthContext'
import { listActivePlans, getActiveSubscription, formatPremiumUntil, type ActiveSubscription } from '../../services/subscriptions'
import './dashboard.css'
import './RandomCall.styles.css'

// Premium for everyone who isn't on the men's round plans: keeps random-call chats open
// past 24 hours and raises the daily call limit. Admins mark plans with audience 'female' or 'all'.
export default function PremiumPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [plans, setPlans] = useState<any[]>([])
  const [sub, setSub] = useState<ActiveSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([listActivePlans(), getActiveSubscription(user.uid)])
      .then(([pl, s]) => {
        const audience = profile?.gender === 'male' ? 'male' : 'female'
        setPlans(pl
          .filter((p: any) => (p.audience ?? 'male') === audience || p.audience === 'all')
          .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)))
        setSub(s)
      })
      .catch((e) => toast.error(e?.message || 'Failed to load plans'))
      .finally(() => setLoading(false))
  }, [user, profile?.gender])

  const isFemale = profile?.gender === 'female'
  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}
        <div className="rc-wrap">
          <div className="rc-card" style={{ maxWidth: 520 }}>
            <div className="rc-emoji">💎</div>
            <h2>DateU Premium</h2>
            <p className="rc-muted">
              Keep chatting with people you meet on random calls after the free 24 hours, and get more calls every day.
            </p>
            {sub && <p className="rc-notice">✅ Premium is active{formatPremiumUntil(sub) ? ` until ${formatPremiumUntil(sub)}` : ''}.</p>}
            <p className="rc-muted rc-small">Premium improves your chances but doesn't guarantee a match. Non-refundable once activated — see our <a href="/legal/refunds">refund policy</a>.</p>
            {loading ? (
              <p className="rc-muted">Loading plans…</p>
            ) : plans.length === 0 ? (
              <p className="rc-muted">No Premium plans are available right now. Please check back soon.</p>
            ) : (
              plans.map((p) => {
                const price = Number(p.price || 0)
                const discount = Number(p.discountPercent || 0)
                const final = Math.round(price * (1 - discount / 100))
                return (
                  <div key={p.id} className="rc-card" style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', gap: '0.5rem' }}>
                    <div className="rc-peer-name">{p.name}</div>
                    <div className="rc-timer" style={{ fontSize: '1.75rem' }}>
                      ₹{final}
                      {discount > 0 && <span className="rc-muted rc-small" style={{ textDecoration: 'line-through', marginLeft: 8 }}>₹{price}</span>}
                    </div>
                    {Array.isArray(p.offers) && p.offers.map((o: string) => <div key={o} className="rc-muted rc-small">✓ {o}</div>)}
                    {typeof p.dailyCallLimit === 'number' && <div className="rc-muted rc-small">✓ {p.dailyCallLimit} random calls a day</div>}
                    <div className="rc-muted rc-small">✓ {Number(p.durationDays) > 0 ? p.durationDays : 30} days of Premium</div>
                    <button
                      className="rc-btn rc-btn-primary"
                      onClick={() => nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${final}`)}
                    >
                      {sub ? 'Extend Premium' : 'Get Premium'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
