import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { PLANS, UPI_ID, UPI_QR_URL } from '../config/payments'
import { createPayment } from '../services/payments'
import Navbar from '../components/Navbar'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

type PlanLike = { id: string; name: string; amount: number }

export default function PaymentPage(){
  const nav = useNavigate()
  const { user } = useAuth()
  const [sp] = useSearchParams()
  const params = useParams()

  const paramPlanId = useMemo(()=> sp.get('planId') || params.planId || 'basic', [sp, params])
  const amountOverride = sp.get('amount')

  const [resolvedPlan, setResolvedPlan] = useState<PlanLike | null>(null)
  const [proof, setProof] = useState<File|null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Resolve plan from Firestore if not present in PLANS
  useEffect(() => {
    const local = PLANS.find(p => p.id === paramPlanId)
    if (local) {
      setResolvedPlan({ id: local.id, name: local.name, amount: local.amount })
      return
    }
    // Try Firestore "plans/{planId}"
    (async () => {
      const snap = await getDoc(doc(db, 'plans', paramPlanId))
      if (snap.exists()) {
        const d = snap.data() as any
        setResolvedPlan({ id: snap.id, name: d.name || snap.id, amount: Number(d.price || d.amount || 0) })
      } else {
        // Fallback to URL amount and id if admin plan not found (keeps flow working)
        setResolvedPlan({
          id: paramPlanId,
          name: paramPlanId,
          amount: Number(amountOverride || 0),
        })
      }
    })()
  }, [paramPlanId, amountOverride])

  async function onConfirmPaid(){
    if(!user) { alert('Please login first'); return }
    if(!resolvedPlan) { alert('Plan not loaded yet'); return }
    setSubmitting(true)
    try {
      await createPayment({
        uid: user.uid,
        planId: resolvedPlan.id,      // IMPORTANT: store the exact plan id so status chips match
        amount: amountOverride ? Number(amountOverride) : resolvedPlan.amount,
        upiId: UPI_ID,
      }, proof || undefined)
      alert('Payment submitted. We will verify it shortly.')
      nav('/dashboard/plans')
    } catch (e:any) {
      console.error(e)
      alert(e?.message || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  function copyUPI(){
    navigator.clipboard.writeText(UPI_ID).then(()=> {
      alert('UPI ID copied')
    }).catch(()=>{})
  }

  if (!resolvedPlan) {
    return (
      <>
        <Navbar />
        <div className="container"><div className="card" style={{maxWidth: 820, margin: '24px auto', padding: 24}}>Loading…</div></div>
      </>
    )
  }

  const amount = amountOverride ? Number(amountOverride) : resolvedPlan.amount

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{maxWidth: 820, margin: '24px auto', padding: 24}}>
          <h2 style={{marginTop:0}}>Complete Payment</h2>
          <p style={{marginTop:6, color:'var(--muted)'}}>Plan: <b>{resolvedPlan.name}</b> • Amount: <b>₹{amount}</b></p>

          <div className="row" style={{gap:24, alignItems:'flex-start', flexWrap:'wrap', marginTop:16}}>
            <div className="stack" style={{minWidth:260}}>
              <img
                src={UPI_QR_URL}
                alt="UPI QR"
                style={{width:260, height:260, objectFit:'contain', borderRadius:12, border:'1px solid var(--card-border)'}}
              />
              <small style={{color:'var(--muted)'}}>Scan the QR with your UPI app</small>
            </div>

            <div className="stack" style={{flex:1, minWidth:260}}>
              <label style={{fontWeight:600}}>UPI ID</label>
              <div className="row" style={{gap:8}}>
                <input className="input" readOnly value={UPI_ID} />
                <button type="button" className="btn btn-primary" onClick={copyUPI}>Copy</button>
              </div>

              <div className="stack" style={{marginTop:16}}>
                <label style={{fontWeight:600}}>Payment screenshot (optional)</label>
                <input className="input" type="file" accept="image/*" onChange={(e)=> setProof(e.target.files?.[0] || null)} />
                <small style={{color:'var(--muted)'}}>Attach proof to speed up approval.</small>
              </div>

              <div className="row" style={{justifyContent:'flex-end', marginTop:16}}>
                <button className="btn btn-primary" onClick={onConfirmPaid} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'I have paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}