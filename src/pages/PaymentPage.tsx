import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import {
  UPI_ID,
  UPI_QR_URL,
  ensurePlans,
  getPlanById,
  type Plan
} from '../config/payments'
import { createOrder, verifyPayment } from '../services/razorpay'
import { createPayment } from '../services/payments'
import Navbar from '../components/Navbar'
import {doc, getDoc} from "firebase/firestore";
import { db } from '../firebase'


declare global {
  interface Window {
    Razorpay: any
  }
}

type PlanLike = { id: string; name: string; amount: number }

export default function PaymentPage() {
  const { user } = useAuth()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const params = useParams()

  const planId = sp.get('plan') || sp.get('planId') || 'pro'

  const amountOverride = sp.get('amount')

  const [resolvedPlan, setResolvedPlan] = useState<PlanLike | null>(null)
  const [proof, setProof] = useState<File|null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [provisionPending, setProvisionPending] = useState(false)

  const loadPlan = useCallback(async () => {
    setLoadingPlan(true)
    try {
      await ensurePlans()
      const p = await getPlanById(planId)
      setPlan(p)
      if (!p) setError('Plan not found or inactive.')
    } catch (e: any) {
      console.error(e)
      setError('Failed to load plans.')
    } finally {
      setLoadingPlan(false)
    }
  }, [planId])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  async function loadRazorpayScript() {
    if (window.Razorpay) return
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
      document.body.appendChild(s)
    })
  }

  async function startPayment() {
    if (!user) {
      setError('Please sign in first.')
      return
    }
    if (!plan) {
      setError('Plan not loaded.')
      return
    }
    setError(null)
    setInitializing(true)

    try {
      await loadRazorpayScript()
      // Server now derives price; we only send planId
      const order = await createOrder(plan.id)

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'DateU',
        description: `Purchase: ${plan.name}`,
        order_id: order.orderId,
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        handler: async (resp: any) => {
          try {
            const verifyRes = await verifyPayment({
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
              planId: plan.id,
            })
            setSuccess(true)
            if (!verifyRes.subscriptionProvisioned) {
              setProvisionPending(true)
            }
            setInitializing(false)
            setTimeout(() => navigate('/dashboard/plans'), 1200)
          } catch (e: any) {
            console.error(e)
            setError(e?.message || 'Verification failed. Contact support.')
            setInitializing(false)
          }
        },
        modal: {
          ondismiss: () => setInitializing(false),
        },
        theme: { color: '#ff416c' },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Could not start payment.')
      setInitializing(false)
    }
  }


  useEffect(() => {
    const local = loadingPlan ? null : plan ? { id: plan.id, name: plan.name, amount: plan.amount } : null
    const paramPlanId = planId || 'pro'
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
  }, [planId, amountOverride])

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
      navigate('/dashboard/plans')
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
      <div className="container" style={{ maxWidth: 820, padding: '24px 0' }}>
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
                <label style={{fontWeight:600}}>Payment screenshot (IMPORTANT)</label>
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
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Complete Payment</h2>

            {loadingPlan && (
              <p className="muted" style={{ marginTop: 4 }}>Loading plan...</p>
            )}

            {!loadingPlan && plan && (
              <p className="muted" style={{ marginTop: 4 }}>
                Plan:&nbsp;
                <strong>{plan.name}</strong>
                &nbsp;• Amount:&nbsp;
                <strong>₹{plan.price}</strong>
              </p>
            )}

            {!loadingPlan && !plan && (
              <div className="banner" style={{ marginTop: 16 }}>
                Plan unavailable or inactive.
              </div>
            )}

          <p style={{ marginTop: 18 }}>
            {!plan
              ? 'Select a valid plan to proceed.'
              : 'Click the button below to pay securely via Razorpay. Do not refresh or close the window until payment completes.'}
          </p>

          {error && (
            <div className="banner" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div className="banner" style={{ marginTop: 16 }}>
              Payment successful
              {provisionPending ? ', provisioning your plan...' : '! Redirecting...'}
            </div>
          )}

          <div style={{ marginTop: 30 }}>
            <button
              className="btn btn-primary"
              onClick={startPayment}
              disabled={initializing || loadingPlan || !plan}
            >
              {initializing
                ? 'Initializing...'
                : !plan
                  ? 'Plan Unavailable'
                  : 'Pay with Razorpay'}
            </button>
          </div>

          <small style={{ display: 'block', marginTop: 24, color: 'var(--muted)' }}>
            If money is deducted but your plan does not appear after a few minutes, contact support with your Razorpay payment id.
          </small>
        </div>
      </div>
    </>
  )
}