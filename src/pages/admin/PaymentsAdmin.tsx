import React, { useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { approvePayment, rejectPayment, listPendingPayments, Payment } from '../../services/payments'
import { SupportQuery, listPendingQueries, resolveQuery } from '../../services/support'

export type EnrichedPayment = Payment & { userName?: string, gender?: string, instagramId?: string }
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EnrichedPayment[]>([])
  const [queries, setQueries] = useState<SupportQuery[]>([])
  const [activeTab, setActiveTab] = useState<'payments' | 'support'>('payments')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Access is checked by AdminGuard (two-step admin session) and the database rules
  useEffect(() => {
    refresh()
  }, [])

  async function approve(paymentId: string) {
    setBusyId(paymentId)
    try {
      await approvePayment(paymentId) // status-only; backend trigger provisions
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
      // Recent payments of every status (pending ones feed the review queue)
      const snap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(150)))
      const recent = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Payment))
      const pendingExtra = (await listPendingPayments()).filter((p) => !recent.some((r) => r.id === p.id))
      const all = [...pendingExtra, ...recent]
      const names: Record<string, any> = {}
      await Promise.all([...new Set(all.map((p) => p.uid))].map(async (uid) => {
        const [u, pv] = await Promise.all([getDoc(doc(db, 'users', uid)).catch(() => null), getDoc(doc(db, 'userPrivate', uid)).catch(() => null)])
        names[uid] = { ...(u?.data() || {}), instagramId: pv?.data()?.instagramId || u?.data()?.instagramId }
      }))
      const enriched = all.map((p) => {
        const udata = names[p.uid] || {}
        return { ...p, userName: udata?.name || 'User', gender: udata?.gender || '-', instagramId: udata?.instagramId || '' }
      })
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

  const pending = rows.filter((p) => (p.status ?? 'pending') === 'pending')

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

          {/* Pending payments: review queue */}
          <PendingQueue rows={pending} busyId={busyId} onApprove={(id) => approve(id)} onReject={async (id, reason) => {
            setBusyId(id)
            try { await rejectPayment(id, reason); await refresh() } finally { setBusyId(null) }
          }} />

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
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                            ₹{p.amount} • {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A'}
                            {(p as any).utr && <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>UTR {(p as any).utr}</span>}
                            {p.referralDiscountApplied && <span style={{ color: '#facc15', marginLeft: 6, fontSize: 10, border: '1px solid #facc15', padding: '0 4px', borderRadius: 4 }}>Referral</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}`}>
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


const REJECT_REASONS = [
  'Amount doesn’t match the plan price',
  'Transaction ID not found in our account',
  'Screenshot is unclear or doesn’t show the payment',
  'Duplicate submission',
]

function ago(ts: any) {
  const ms = ts?.toMillis ? ts.toMillis() : 0
  if (!ms) return ''
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

/** One card per pending payment: screenshot, UTR and amount side by side, one tap to approve. */
function PendingQueue({ rows, busyId, onApprove, onReject }: {
  rows: EnrichedPayment[]
  busyId: string | null
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => Promise<void>
}) {
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  if (!rows.length) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: 28 }}>
        ✅ No payments waiting for review.
      </div>
    )
  }

  // Oldest first, so nobody waits too long
  const sorted = [...rows].sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0))
  return (
    <div className="admin-card">
      <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>Waiting for review</h3>
        <span className="badge badge-warning">{rows.length}</span>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--admin-text-muted)' }}>
        Check the transaction ID and amount in your bank or UPI app, then approve. Premium starts instantly and the user is notified.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {sorted.map((p) => {
          const id = p.id!
          const utr = (p as any).utr as string | undefined
          return (
            <div key={id} style={{ border: '1px solid var(--admin-border, rgba(255,255,255,0.1))', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.userName || 'User'}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{p.planId} · {ago(p.createdAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>₹{p.amount}</div>
                  {p.referralDiscountApplied && <div style={{ fontSize: 11, color: '#facc15' }}>Referral discount</div>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(127,127,127,0.1)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>UTR / Transaction ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }}>{utr || '— not provided —'}</div>
                </div>
                {utr && (
                  <button className="btn btn-xs" onClick={() => { navigator.clipboard.writeText(utr).catch(() => { }); setCopied(id); setTimeout(() => setCopied(null), 1500) }}>
                    {copied === id ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>

              {p.proofUrl ? (
                <button type="button" onClick={() => setZoom(p.proofUrl!)} style={{ padding: 0, border: 0, background: '#000', borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in' }}>
                  <img src={p.proofUrl} alt="Payment screenshot" loading="lazy" style={{ display: 'block', width: '100%', height: 180, objectFit: 'contain' }} />
                </button>
              ) : <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No screenshot</div>}

              {rejecting === id ? (
                <div className="stack" style={{ gap: 6 }}>
                  {REJECT_REASONS.map((r) => (
                    <button key={r} className="btn btn-sm" style={{ justifyContent: 'flex-start' }} disabled={busyId === id}
                      onClick={async () => { await onReject(id, r); setRejecting(null) }}>{r}</button>
                  ))}
                  <input className="input" placeholder="Other reason…" value={custom} onChange={(e) => setCustom(e.target.value)} />
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => { setRejecting(null); setCustom('') }}>Cancel</button>
                    <button className="btn btn-sm" style={{ color: '#dc2626' }} disabled={!custom.trim() || busyId === id}
                      onClick={async () => { await onReject(id, custom.trim()); setRejecting(null); setCustom('') }}>Reject</button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }} disabled={busyId === id} onClick={() => onApprove(id)}>
                    {busyId === id ? 'Working…' : '✓ Approve'}
                  </button>
                  <button className="btn" style={{ color: '#dc2626' }} disabled={busyId === id} onClick={() => setRejecting(id)}>Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
          <img src={zoom} alt="Payment screenshot" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
        </div>
      )}
    </div>
  )
}
