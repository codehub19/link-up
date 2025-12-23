import React, { useEffect, useState, useCallback } from 'react'
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
import HomeBackground from '../components/home/HomeBackground'
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase'
import { useDialog } from '../components/ui/Dialog'
import LoadingHeart from '../components/LoadingHeart'
import './PaymentPage.styles.css'

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
  const { showAlert } = useDialog()
  const params = useParams()

  const planId = sp.get('plan') || sp.get('planId') || 'pro'
  const amountOverride = sp.get('amount')

  const [resolvedPlan, setResolvedPlan] = useState<PlanLike | null>(null)
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [provisionPending, setProvisionPending] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const loadPlan = useCallback(async () => {
    setLoadingPlan(true)
    try {
      await ensurePlans()
      const p = await getPlanById(planId)
      setPlan(p)
      if (!p && !amountOverride) setError('Plan not found or inactive.')
    } catch (e: any) {
      console.error(e)
      setError('Failed to load plans.')
    } finally {
      setLoadingPlan(false)
    }
  }, [planId, amountOverride])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  // Simple mobile device detection
  useEffect(() => {
    const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsMobile(mobile)
  }, [])

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
        // Fallback to URL amount and id if admin plan not found 
        setResolvedPlan({
          id: paramPlanId,
          name: paramPlanId,
          amount: Number(amountOverride || 0),
        })
      }
    })()
  }, [planId, amountOverride, plan, loadingPlan])

  async function onConfirmPaid() {
    if (!user) { await showAlert('Please login first'); return }
    if (!resolvedPlan) { await showAlert('Plan not loaded yet'); return }
    if (!proof) { await showAlert('Please attach a payment screenshot'); return }

    setSubmitting(true)
    try {
      await createPayment({
        uid: user.uid,
        planId: resolvedPlan.id,
        amount: amountOverride ? Number(amountOverride) : resolvedPlan.amount,
        upiId: UPI_ID,
      }, proof || undefined)
      await showAlert('Payment submitted! We will verify and activate your plan shortly.')
      navigate('/dashboard/plans')
    } catch (e: any) {
      console.error(e)
      await showAlert(e?.message || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  function copyUPI() {
    navigator.clipboard.writeText(UPI_ID).then(async () => {
      await showAlert('UPI ID copied')
    }).catch(() => { })
  }

  if (!resolvedPlan) {
    return (
      <div className="loading-page-wrapper">
        <LoadingHeart size={72} />
      </div>
    )
  }

  const amount = amountOverride ? Number(amountOverride) : resolvedPlan.amount

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container payment-page-container">

        {/* Header */}
        <div className="payment-hero">
          <h1 className="payment-title text-gradient">Complete Payment</h1>
          <p className="payment-subtitle">Secure your spot in the next round</p>
        </div>

        {/* Main Card */}
        <div className="payment-card">
          <div className="payment-content">

            {/* Left Col: QR */}
            <div className="qr-section">
              <div className="qr-code-wrapper">
                <img
                  src={UPI_QR_URL}
                  alt="Payment QR Code"
                  className="qr-image"
                />
              </div>
              <p className="qr-instruction">
                Scan with any UPI app<br />
                (GPay, PhonePe, Paytm)
              </p>
            </div>

            {/* Right Col: Details */}
            <div className="payment-details">

              {/* Plan Box */}
              <div className="plan-summary-box">
                <div>
                  <div className="plan-label">Selected Plan</div>
                  <div className="plan-name">{resolvedPlan.name}</div>
                </div>
                <div className="plan-price">₹{amount}</div>
              </div>

              {/* UPI ID */}
              <div className="upi-box">
                <label className="input-label">UPI ID</label>
                <div className="copy-input-group">
                  <input className="upi-input" readOnly value={UPI_ID} />
                  <button type="button" className="btn-copy" onClick={copyUPI}>
                    Copy
                  </button>
                </div>
              </div>

              {/* Mobile Options (Conditional) */}
              {isMobile && (
                <div className="upi-box">
                  <label className="input-label">Quick Pay</label>
                  <div className="mobile-pay-options">
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=DateU&am=${amount}&cu=INR`}
                      className="btn-upi-intent"
                      style={{ background: '#4285F4' }}
                    >
                      GPay
                    </a>
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=DateU&am=${amount}&cu=INR`}
                      className="btn-upi-intent"
                      style={{ background: '#5D3FD3' }}
                    >
                      PhonePe
                    </a>
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=DateU&am=${amount}&cu=INR`}
                      className="btn-upi-intent"
                      style={{ background: '#02b1ff' }}
                    >
                      Paytm
                    </a>
                  </div>
                </div>
              )}

              {/* Upload Proof */}
              <div className="upload-box">
                <label className="input-label">Payment Screenshot</label>
                <div
                  className={`file-input-wrapper ${proof ? 'has-file' : ''}`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProof(e.target.files?.[0] || null)}
                  />
                  {proof ? (
                    <span className="upload-success">
                      ✓ Screenshot Attached: {proof.name.slice(0, 20)}...
                    </span>
                  ) : (
                    <span className="upload-placeholder">
                      Click to upload screenshot
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Action */}
              <button
                className="btn-confirm-payment"
                onClick={onConfirmPaid}
                disabled={submitting}
              >
                {submitting ? 'Verifying...' : 'Submit Payment'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}