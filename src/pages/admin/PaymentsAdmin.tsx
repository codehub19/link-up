import React, { useEffect, useState } from 'react'
import AdminGuard from './AdminGuard'
import { listPendingPayments, rejectPayment, approvePayment } from '../../services/payments'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import AdminHeader from '../../components/admin/AdminHeader'

export default function PaymentsAdmin(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string|null>(null)
  const [search, setSearch] = useState('')

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
      <div className="container">
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