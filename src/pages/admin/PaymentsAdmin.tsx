import React, { useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { approvePayment, rejectPayment, listPendingPayments, Payment } from '../../services/payments'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const [pending, setPending] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isAdmin = !!profile?.isAdmin

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    listPendingPayments()
      .then(rows => setPending(rows))
      .catch(() => setPending([]))
      .finally(() => setLoading(false))
  }, [isAdmin])

  if (!isAdmin) {
    return <div style={{ padding: 24 }}>Access denied.</div>
  }

  async function approve(paymentId: string) {
    setBusyId(paymentId)
    try {
      await approvePayment(paymentId) // status-only; backend trigger provisions
      alert('Approved')
      await refresh()
    } catch (e: any) {
      console.error('approve error', e)
      alert(e?.message || 'Failed to approve')
    } finally {
      setBusyId(null)
    }
  }

  async function refresh() {
    setLoading(true)
    try {
      const pending = await listPendingPayments()
      const enriched = await Promise.all(pending.map(async p => {
        const u = await getDoc(doc(db, 'users', p.uid))
        const udata = u.data() || {}
        return { ...p, userName: udata?.name || 'User', gender: udata?.gender || '-', instagramId: udata?.instagramId || '' }
      }))
      setRows(enriched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = rows.filter(p =>
    (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.instagramId || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.planId || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-container">
      <div className="row stack-mobile" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0 }}>Payments Management</h2>
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <input
            className="input"
            placeholder="Search payments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
          <div style={{ position: 'absolute', left: 10, top: 10, opacity: 0.5 }}>🔍</div>
        </div>
      </div>

      <div className="stack" style={{ gap: 24 }}>

        {/* Pending Payments Section */}
        {pending.length > 0 && (
          <div className="admin-card">
            <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Pending Approval</h3>
              <span className="badge badge-warning">{pending.length} pending</span>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>UPI ID</th>
                    <th>Submitted</th>
                    <th>Proof</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.uid.substring(0, 8)}...</div>
                      </td>
                      <td>{p.planId}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{p.amount}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.upiId || '-'}</td>
                      <td>{p.createdAt?.toDate?.().toLocaleString?.() || '-'}</td>
                      <td>
                        {p.proofUrl ? (
                          <a href={p.proofUrl} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost" style={{ fontSize: 12 }}>
                            View Proof
                          </a>
                        ) : <span className="text-muted">-</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn btn-xs btn-primary"
                            disabled={busyId === p.id}
                            onClick={() => p.id && approve(p.id)}
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-xs btn-ghost"
                            disabled={busyId === p.id}
                            onClick={async () => { if (p.id) { await rejectPayment(p.id); await refresh() } }}
                            style={{ color: '#dc2626' }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Payments / History Section */}
        <div className="admin-card">
          <h3 style={{ margin: '0 0 16px 0' }}>Payment History</h3>

          {loading ? <p>Loading history...</p> : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Info</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.userName || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>@{p.instagramId}</div>
                      </td>
                      <td>
                        <div>Plan: <b>{p.planId}</b></div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>₹{p.amount} • {p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td>
                        <span className={`badge badge - ${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'} `}>
                          {p.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {p.status === 'pending' && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => p.id && approve(p.id)}
                            disabled={busyId === p.id}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: 32 }}>
                        No payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
