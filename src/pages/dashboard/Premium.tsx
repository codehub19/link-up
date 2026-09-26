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
import './male/Plans.styles.css'

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
  const Check = () => (
    <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
  )
  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}
        <div className="plans-hero">
          <div className="plans-crown" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20" /><path d="M4 17 2 7l6 4 4-7 4 7 6-4-2 10z" /></svg>
          </div>
          <h1 className="plans-title text-gradient">DateU Premium</h1>
          <p className="plans-subtitle">
            Keep chatting with people you meet on random calls after the free 24 hours, and get more calls every day.
          </p>
        </div>

        {sub && (
          <div className="active-plan-banner">
            <div className="banner-content">
              <div className="banner-title">Current Membership</div>
              <div className="banner-details">
                {formatPremiumUntil(sub) ? `Premium active until ${formatPremiumUntil(sub)}` : 'Premium active'}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="plan-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
            Premium plans aren’t available right now. Please check back soon.
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((p) => {
              const price = Number(p.price || 0)
              const discount = Number(p.discountPercent || 0)
              const final = Math.round(price * (1 - discount / 100))
              const days = Number(p.durationDays) > 0 ? Number(p.durationDays) : 30
              return (
                <div key={p.id} className="plan-card">
                  <div className="plan-header"><div className="plan-name">{p.name}</div></div>
                  <div className="plan-price-block">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span className="plan-price">₹{final}</span>
                      <span className="plan-period">for {days} days</span>
                    </div>
                    {discount > 0 && <div className="plan-per-day"><s>₹{price}</s> · {discount}% off</div>}
                    {final > 0 && days > 1 && <div className="plan-per-day">That’s about ₹{Math.max(1, Math.round(final / days))} a day</div>}
                  </div>
                  <ul className="plan-features">
                    <li className="plan-feature-item"><Check />Keep chatting after the free 24 hours</li>
                    {typeof p.dailyCallLimit === 'number' && <li className="plan-feature-item"><Check />{p.dailyCallLimit} random calls a day</li>}
                    {Array.isArray(p.offers) && p.offers.map((o: string) => <li key={o} className="plan-feature-item"><Check />{o}</li>)}
                  </ul>
                  <div className="plan-actions">
                    <button className="plan-btn plan-btn-primary" onClick={() => nav(`/pay?planId=${encodeURIComponent(p.id)}&amount=${final}`)}>
                      {sub ? 'Extend Premium' : 'Get Premium'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="plans-footnote">
          Premium improves your chances but doesn’t guarantee a match. Non-refundable once activated — see our{' '}
          <a href="/legal/refunds">refund policy</a>.
        </p>
      </div>
    </>
  )
}
