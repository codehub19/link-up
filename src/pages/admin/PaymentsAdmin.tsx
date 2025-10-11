import React, { useEffect, useState } from 'react'
import AdminGuard from './AdminGuard'
import { useAuth } from '../../state/AuthContext'
import {approvePayment, rejectPayment ,listPendingPayments, Payment } from '../../services/payments'
import {doc, getDoc} from 'firebase/firestore'
import { db } from '../../firebase'
import AdminHeader from '../../components/admin/AdminHeader'

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const [pending, setPending] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [busyId, setBusyId] = useState<string|null>(null)
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

  async function refresh(){
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

  useEffect(()=>{ refresh() }, [])

  const filtered = rows.filter(p =>
    (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.instagramId || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.planId || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminGuard>
      <div className='container'>
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:1000}}>
          <AdminHeader title="Payments" />
          {loading && <p>Loading pending payments...</p>}
          {!loading && pending.length === 0 && (
            <p>No pending payments 🎉</p>
          )}
          {!loading && pending.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">User</th>
                  <th align="left">Plan</th>
                  <th align="right">Amount</th>
                  <th align="left">Status</th>
                  <th align="left">Created</th>
                </tr>
              </thead>
                <tbody>
                  {pending.map(p => (
                    <tr key={p.id}>
                      <td>{p.uid}</td>
                      <td>{p.planId}</td>
                      <td style={{ textAlign: 'right' }}>₹{p.amount}</td>
                      <td>{p.status}</td>
                      <td>{p.createdAt?.toDate?.().toLocaleString?.() || '-'}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
          )}
        </div>
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:1000}}>
          <AdminHeader current="payments" />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{marginTop:0}}>Payments (Pending)</h2>
            <input className="input" placeholder="Search name/insta/plan…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth: 260 }} />
          </div>
          {loading ? <p>Loading…</p> : null}
          <div className="stack">
            {filtered.map(p => (
              <div key={p.id} className="card" style={{padding:16}}>
                <div className="row" style={{justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                  <div>
                    <div><b>{p.userName}</b> • {p.gender} {p.instagramId ? <span className="muted">(@{p.instagramId})</span> : null}</div>
                    <div style={{color:'var(--muted)', fontSize:13}}>
                      Plan: {p.planId} • Amount: ₹{p.amount} • UPI: {p.upiId}
                    </div>
                    {p.proofUrl ? (
                      <div style={{marginTop:6}}>
                        <a href={p.proofUrl} target="_blank" rel="noreferrer">View proof</a>
                      </div>
                    ) : null}
                  </div>
                  <div className="row" style={{gap:8}}>
                    <button className="btn btn-primary" disabled={busyId===p.id} onClick={()=>approve(p.id)}>
                      {busyId===p.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button className="btn btn-ghost" disabled={busyId===p.id} onClick={async ()=>{ await rejectPayment(p.id); await refresh() }}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading ? <p style={{color:'var(--muted)'}}>No pending payments.</p> : null}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}