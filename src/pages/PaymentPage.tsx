import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import {
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
import { isIOS } from '../utils/pwa'
import QRCode from 'qrcode'
import { DEFAULT_PAYMENT_SETTINGS, PaymentSettings, UTR_PATTERN, subscribePaymentSettings, upiLink } from '../services/paymentSettings'
import { DuplicateUtrError } from '../services/payments'

declare global {
  interface Window {
    Razorpay: any
  }
}

type PlanLike = { id: string; name: string; amount: number }

export default function PaymentPage() {
  const { user, profile } = useAuth()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { showAlert } = useDialog()
  const params = useParams()

  const planId = sp.get('plan') || sp.get('planId') || 'pro'
  const amountOverride = sp.get('amount')
  const isReferral = sp.get('referral') === 'true'

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
        const originalPrice = Number(d.price || d.amount || 0)
        const discount = Number(d.discountPercent || 0)
        const finalPrice = discount > 0 ? Math.round(originalPrice * (1 - discount / 100)) : originalPrice

        setResolvedPlan({
          id: snap.id,
          name: d.name || snap.id,
          amount: finalPrice,
          originalAmount: discount > 0 ? originalPrice : undefined,
          discountPercent: discount > 0 ? discount : undefined
        } as any)
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

  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS)
  const [utr, setUtr] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  useEffect(() => subscribePaymentSettings(setSettings), [])
  // QR code with the UPI ID and exact amount, so it always matches the admin settings
  const qrAmount = amountOverride ? Number(amountOverride) : (resolvedPlan?.amount ?? 0)
  useEffect(() => {
    if (!qrAmount) { setQrDataUrl(null); return }
    QRCode.toDataURL(upiLink(settings, qrAmount), { width: 480, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [settings, qrAmount])

  async function onConfirmPaid() {
    if (!user) { await showAlert('Please login first'); return }
    if (!resolvedPlan) { await showAlert('Plan not loaded yet'); return }
    if (amount > 0 && !UTR_PATTERN.test(utr)) { await showAlert('Please enter the 12-digit UPI transaction ID (UTR) from your payment app.'); return }
    if (amount > 0 && !proof) { await showAlert('Please attach a payment screenshot'); return }

    setSubmitting(true)
    try {
      await createPayment({
        uid: user.uid,
        planId: resolvedPlan.id,
        amount: amount,
        upiId: amount > 0 ? settings.upiId : 'REFERRAL',
        ...(amount > 0 ? { utr } : {}),
        referralDiscountApplied: isReferral
      }, proof || undefined)
      await showAlert('Payment submitted! We will verify and activate your plan shortly.')
      navigate(profile?.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium')
    } catch (e: any) {
      if (e instanceof DuplicateUtrError) {
        await showAlert('This transaction ID has already been submitted. If you paid again, enter the new payment’s ID — or contact support@dateu.in.')
        return
      }
      console.error(e)
      await showAlert(e?.message || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  const [copied, setCopied] = useState(false)
  function copyUPI() {
    navigator.clipboard.writeText(settings.upiId).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }).catch(() => { })
  }
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!proof) { setProofPreview(null); return }
    const u = URL.createObjectURL(proof)
    setProofPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [proof])

  if (!resolvedPlan) {
    return (
      <div className="loading-page-wrapper">
        <LoadingHeart size={72} />
      </div>
    )
  }

  const amount = amountOverride ? Number(amountOverride) : resolvedPlan.amount

  const upiQuery = upiLink(settings, amount).split('?')[1]
  // Each app has its own link; the generic upi:// link doesn't open anything on iPhone
  const upiApps = [
    { name: 'GPay', href: `${isIOS() ? 'gpay' : 'tez'}://upi/pay?${upiQuery}`, bg: '#4285F4' },
    { name: 'PhonePe', href: `phonepe://pay?${upiQuery}`, bg: '#5D3FD3' },
    { name: 'Paytm', href: `paytmmp://pay?${upiQuery}`, bg: '#00b9f1' },
    { name: 'Other UPI', href: `upi://pay?${upiQuery}`, bg: '#3f3f46' },
  ]

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container payment-page-container">
        <div className="pay-page">
          {/* Order summary */}
          <div className="pay-summary">
            <div>
              <div className="pay-summary-label">You’re buying</div>
              <div className="pay-summary-plan">{resolvedPlan.name}</div>
            </div>
            <div className="pay-summary-price">
              ₹{amount}
              {(resolvedPlan as any).originalAmount && <s>₹{(resolvedPlan as any).originalAmount}</s>}
            </div>
          </div>

          {settings.paused && amount > 0 && (
            <div className="pay-free" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)', color: '#fde68a' }}>
              <strong style={{ color: '#fbbf24' }}>Payments are paused for a moment</strong>
              <span>We’re updating our payment details. Please try again in a little while.</span>
            </div>
          )}

          {amount > 0 && !settings.paused ? (
            <>
              <section className="pay-step">
                <div className="pay-step-head"><span className="pay-step-num">1</span>Pay ₹{amount} with UPI</div>
                {isMobile && (
                  <div className="pay-apps">
                    {upiApps.map((a) => (
                      <a key={a.name} href={a.href} className="pay-app" style={{ background: a.bg }}>{a.name}</a>
                    ))}
                  </div>
                )}
                <div className="pay-upi">
                  <div>
                    <div className="pay-upi-label">UPI ID</div>
                    <div className="pay-upi-id">{settings.upiId}</div>
                    <div className="pay-upi-label">Pays to {settings.payeeName}</div>
                  </div>
                  <button type="button" className="pay-copy" onClick={copyUPI}>{copied ? 'Copied ✓' : 'Copy'}</button>
                </div>
                <details className="pay-qr" open={!isMobile}>
                  <summary>{isMobile ? 'Paying from another phone? Show QR code' : 'Scan the QR code'}</summary>
                  {qrDataUrl ? <img src={qrDataUrl} alt={`UPI QR code for ₹${amount}`} /> : null}
                  <p className="pay-qr-hint">The amount (₹{amount}) is filled in automatically.</p>
                </details>
              </section>

              <section className="pay-step">
                <div className="pay-step-head"><span className="pay-step-num">2</span>Confirm your payment</div>
                <label className="pay-field">
                  <span>UPI transaction ID (UTR)</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="12-digit number, e.g. 412345678901"
                    value={utr}
                    maxLength={12}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  />
                  <small className={utr && !UTR_PATTERN.test(utr) ? 'bad' : ''}>
                    {utr && !UTR_PATTERN.test(utr)
                      ? `${utr.length}/12 digits`
                      : 'Find it in your UPI app under the payment details (also called UPI Ref No. / Transaction ID).'}
                  </small>
                </label>
                <label className={`pay-upload ${proof ? 'has-file' : ''}`}>
                  <input type="file" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] || null)} />
                  {proofPreview ? (
                    <>
                      <img src={proofPreview} alt="Payment screenshot" />
                      <span className="pay-upload-change">Change</span>
                    </>
                  ) : (
                    <span className="pay-upload-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      Tap to choose the screenshot
                      <small>It should show the amount and the transaction ID</small>
                    </span>
                  )}
                </label>
              </section>
            </>
          ) : amount <= 0 ? (
            <div className="pay-free">
              <strong>100% discount applied</strong>
              <span>You can activate this plan for free with your referral rewards.</span>
            </div>
          ) : null}

          <div className="pay-submit-bar">
            <button
              className="btn-confirm-payment"
              onClick={onConfirmPaid}
              disabled={submitting || settings.paused || (amount > 0 && (!proof || !UTR_PATTERN.test(utr)))}
            >
              {submitting ? 'Submitting…' : amount > 0 ? 'Submit for verification' : 'Activate plan'}
            </button>
            <p>
              {amount > 0
                ? (settings.note || 'We usually verify payments within a few hours. Premium starts once it’s confirmed.')
                : 'Premium starts right away.'}{' '}
              Non-refundable once activated — <a href="/legal/refunds">refund policy</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
