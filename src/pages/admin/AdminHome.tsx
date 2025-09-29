import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminGuard from './AdminGuard'
import { getActiveRound } from '../../services/rounds'
import { listPendingPayments } from '../../services/payments'
import { listActivePlans } from '../../services/subscriptions'

export default function AdminHome() {
  const [loading, setLoading] = useState(true)
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0)
  const [activePlansCount, setActivePlansCount] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [round, pending, plans] = await Promise.all([
          getActiveRound(),
          listPendingPayments(),
          listActivePlans(),
        ])
        setActiveRoundId(round?.id ?? null)
        setPendingPaymentsCount(pending.length)
        setActivePlansCount(plans.length)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 1100 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Admin Home</h2>
            {loading ? <span className="tag">Loading…</span> : null}
          </div>

          <div className="row" style={{ gap: 12, marginTop: 8, color: 'var(--muted)' }}>
            <div>Active round: <b>{activeRoundId ?? 'None'}</b></div>
            <div>•</div>
            <div>Pending payments: <b>{pendingPaymentsCount}</b></div>
            <div>•</div>
            <div>Active plans: <b>{activePlansCount}</b></div>
          </div>

          <div className="grid cols-2" style={{ gap: 16, marginTop: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Matching Rounds</h3>
                <span className="tag">{activeRoundId ? 'Active' : 'No active round'}</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Create a round, activate/deactivate, and view participants count.
              </p>
              <Link className="btn btn-primary" to="/admin/rounds">Open Rounds</Link>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Payments</h3>
                <span className="tag">{pendingPaymentsCount} pending</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Review payments, Approve to activate plan, or Reject with reason.
              </p>
              <Link className="btn btn-primary" to="/admin/payments">Open Payments</Link>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Curation</h3>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Assign approved males to girls and promote likes to matches.
              </p>
              <Link className="btn btn-primary" to="/admin/curation">Open Curation</Link>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Plans</h3>
                <span className="tag">{activePlansCount} active</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Create and manage subscription plans (price, match quota, support, offers).
              </p>
              <Link className="btn btn-primary" to="/admin/plans">Manage Plans</Link>
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 20 }}>
            <Link className="btn" to="/admin/rounds">Rounds</Link>
            <Link className="btn" to="/admin/payments">Payments</Link>
            <Link className="btn" to="/admin/curation">Curation</Link>
            <Link className="btn" to="/admin/plans">Plans</Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}