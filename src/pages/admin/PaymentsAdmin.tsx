import React, { useEffect, useState } from 'react'
import AdminGuard from './AdminGuard'
import { listPendingPayments, rejectPayment } from '../../services/payments'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { callAdminApprovePayment } from '../../firebase'

export default function PaymentsAdmin(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string|null>(null)

  async function approve(paymentId: string) {
    setBusyId(paymentId)
    try {
      await callAdminApprovePayment({ paymentId })
      alert('Approved and subscription provisioned')
      await refresh()
    } catch (e: any) {
      console.error('approve error', e)
      alert(e?.message || e?.code || 'Failed to approve')
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
        return { ...p, userName: udata?.name || 'User', gender: udata?.gender || '-' }
      }))
      setRows(enriched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ refresh() }, [])

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:1000}}>
          <h2 style={{marginTop:0}}>Payments (Pending)</h2>
          {loading ? <p>Loading…</p> : null}
          <div className="stack">
            {rows.map(p => (
              <div key={p.id} className="card" style={{padding:16}}>
                <div className="row" style={{justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                  <div>
                    <div><b>{p.userName}</b> • {p.gender}</div>
                    <div style={{color:'var(--muted)', fontSize:13}}>
                      Plan: {p.planId} • Amount: ₹{p.amount} • UPI: {p.upiId}
                    </div>
                    {p.proofUrl ? (
                      <div style={{marginTop:6}}><a href={p.proofUrl} target="_blank" rel="noreferrer">View proof</a></div>
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
            {rows.length === 0 && !loading ? <p style={{color:'var(--muted)'}}>No pending payments.</p> : null}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}