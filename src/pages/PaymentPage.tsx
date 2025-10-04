import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import {
  ensurePlans,
  getPlanById,
  type Plan
} from '../config/payments'
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

  const planId = params.get('plan') || params.get('planId') || 'pro'

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

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 820, padding: '24px 0' }}>
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