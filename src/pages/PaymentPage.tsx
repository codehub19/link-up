import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { PLANS } from '../config/payments'
import { createOrder, verifyPayment } from '../services/razorpay'

type Plan = { id: string; name: string; amount: number }

declare global {
  interface Window { Razorpay: any }
}

export default function PaymentPage() {
  const { user } = useAuth()
  const [sp] = useSearchParams()
  const nav = useNavigate()

  const planParam = sp.get('plan') || sp.get('planId') || 'basic'
  const amountOverride = sp.get('amount')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    setLoading(true)
    const local = PLANS.find(p => p.id === planParam)
    if (local) {
      setPlan(local)
      setLoading(false)
      return
    }
    // Fallback custom plan from query (not in PLANS)
    setPlan({
      id: planParam,
      name: planParam,
      amount: Number(amountOverride || 0),
    })
    setLoading(false)
  }, [planParam, amountOverride])

  async function loadRazorpayScript() {
    if (window.Razorpay) return
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
      document.body.appendChild(script)
    })
  }

  async function startPayment() {
    if (!user) { alert('Please login first'); return }
    if (!plan) { alert('Plan not loaded'); return }
    setInitializing(true)
    try {
      await loadRazorpayScript()
      const amount = amountOverride ? Number(amountOverride) : plan.amount
      const order = await createOrder(plan.id, amount)

      const opts = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'LinkUp',
        description: `Plan: ${plan.name}`,
        order_id: order.orderId,
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: { color: '#f43f5e' },
        handler: async (resp: any) => {
          try {
            await verifyPayment({
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
              planId: plan.id,
              amount,
            })
            alert('Payment successful!')
            nav('/dashboard/plans')
          } catch (err: any) {
            console.error(err)
            alert(err?.message || 'Verification failed. Contact support.')
            setInitializing(false)
          }
        },
        modal: {
          ondismiss: () => setInitializing(false),
        },
      }

      const rzp = new window.Razorpay(opts)
      rzp.open()
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Could not initialize payment')
      setInitializing(false)
    }
  }

  if (loading || !plan) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="card" style={{maxWidth:820, margin:'24px auto', padding:24}}>
            Loading…
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{maxWidth:820, margin:'24px auto', padding:24}}>
          <h2 style={{marginTop:0}}>Complete Payment</h2>
          <p style={{marginTop:6, color:'var(--muted)'}}>
            Plan: <b>{plan.name}</b> • Amount: <b>₹{plan.amount}</b>
          </p>
          <p style={{marginTop:16}}>Click below to pay securely with Razorpay.</p>
          <div className="row" style={{justifyContent:'flex-end', marginTop:24}}>
            <button
              className="btn btn-primary"
              onClick={startPayment}
              disabled={initializing}
            >
              {initializing ? 'Initializing…' : 'Pay with Razorpay'}
            </button>
          </div>
          <small style={{display:'block', marginTop:16, color:'var(--muted)'}}>
            Do not refresh while the payment window is open. If money is deducted but upgrade doesn’t show, contact support.
          </small>
        </div>
      </div>
    </>
  )
}