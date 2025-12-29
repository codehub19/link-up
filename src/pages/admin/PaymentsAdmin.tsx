import React, { useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { approvePayment, rejectPayment, listPendingPayments, Payment } from '../../services/payments'
import { SupportQuery, listPendingQueries, resolveQuery } from '../../services/support'

export type EnrichedPayment = Payment & { userName?: string, gender?: string, instagramId?: string }
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EnrichedPayment[]>([])
  const [queries, setQueries] = useState<SupportQuery[]>([])
  const [activeTab, setActiveTab] = useState<'payments' | 'support'>('payments')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isAdmin = !!profile?.isAdmin

  useEffect(() => {
    if (isAdmin) {
      refresh()
    }
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

  async function refreshQueries() {
    try {
      const q = await listPendingQueries()
      const enrichedQ = await Promise.all(q.map(async (item: SupportQuery) => {
        const u = await getDoc(doc(db, 'users', item.uid))
        const udata = u.data() || {}
        return { ...item, userName: udata.name || 'User' }
      }))
      setQueries(enrichedQ)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    refresh()
    refreshQueries()
  }, [])

  const pending = rows

  const filtered = rows.filter(p =>
    (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.instagramId || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.planId || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-container">
      <div className="row stack-mobile" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Payments & Support</h2>
          <div className="tabs" style={{ background: '#262626', padding: 4, borderRadius: 8, display: 'flex', gap: 4 }}>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeTab === 'payments' ? '#404040' : 'transparent',
                color: activeTab === 'payments' ? 'white' : '#aaa', fontWeight: 600
              }}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('support')}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeTab === 'support' ? '#404040' : 'transparent',
                color: activeTab === 'support' ? 'white' : '#aaa', fontWeight: 600
              }}
            >
              Support ({queries.length})
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <input
            className="input"
            placeholder={activeTab === 'payments' ? "Search payments..." : "Search queries..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
          <div style={{ position: 'absolute', left: 10, top: 10, opacity: 0.5 }}>🔍</div>
        </div>
      </div>

      {activeTab === 'support' ? (
        <div className="admin-card">
          <h3 style={{ margin: '0 0 16px 0' }}>Support Requests</h3>
          {queries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>No pending support queries</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Category</th>
                    <th>Message</th>
                    <th>Since</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map(q => (
                    <tr key={q.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.userName || 'User'}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Plan: {q.planId}</div>
                      </td>
                      <td><span className="badge badge-info">{q.category}</span></td>
                      <td style={{ maxWidth: 300 }}>
                        <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.message}</div>
                      </td>
                      <td>{q.createdAt?.toDate?.().toLocaleString?.() || 'Just now'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={async () => {
                            const reply = window.prompt('Enter reply to resolve:')
                            if (!reply) return
                            if (!q.id) return
                            await resolveQuery(q.id, reply)
                            refreshQueries()
                          }}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
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
                          <div style={{ fontWeight: 600 }}>{p.userName || 'User'} <br /><span style={{ fontSize: 12, color: '#666' }}>{p.uid.substring(0, 8)}...</span></div>
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
                              onClick={async () => {
                                if (p.id) {
                                  const reason = window.prompt("Enter rejection reason (optional):");
                                  if (reason === null) return; // Cancelled
                                  await rejectPayment(p.id, reason);
                                  await refresh()
                                }
                              }}
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
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>₹{p.amount} • {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A'}</div>
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
      )}
    </div>
  )
}
