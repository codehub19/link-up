import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { getPlan } from '../config/payments'
import { createOrder, verifyPayment } from '../services/razorpay'

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function PaymentPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const planId = params.get('plan') || params.get('planId') || 'basic'
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const plan = getPlan(planId)

  useEffect(() => {
    setLoading(false)
  }, [planId])

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
    if (!plan.amount || plan.amount <= 0) {
      setError('Invalid plan amount.')
      return
    }
    setError(null)
    setInitializing(true)

    try {
      await loadRazorpayScript()
      const order = await createOrder(plan)

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'LinkUp',
        description: `Purchase: ${plan.name}`,
        order_id: order.orderId,
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        handler: async (resp: any) => {
          try {
            await verifyPayment({
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
              planId: plan.id,
              amount: plan.amount,
            })
            setSuccess(true)
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="card" style={{ padding: 24, margin: '32px auto', maxWidth: 720 }}>
            Loading...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 820, padding: '24px 0' }}>
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Complete Payment</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Plan: <strong>{plan.name}</strong> • Amount: <strong>₹{plan.amount}</strong>
          </p>
          <p style={{ marginTop: 18 }}>
            Click the button below to pay securely via Razorpay. Do not refresh or close the window until payment finishes.
          </p>

            {error && (
              <div className="banner" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}
            {success && (
              <div className="banner" style={{ marginTop: 16 }}>
                Payment successful! Redirecting...
              </div>
            )}

          <div style={{ marginTop: 30 }}>
            <button
              className="btn btn-primary"
              onClick={startPayment}
              disabled={initializing}
            >
              {initializing ? 'Initializing...' : 'Pay with Razorpay'}
            </button>
          </div>

          <small style={{ display: 'block', marginTop: 24, color: 'var(--muted)' }}>
            If money is deducted but the plan does not appear after a few minutes, contact support with your Razorpay payment id.
          </small>
        </div>
      </div>
    </>
  )
}