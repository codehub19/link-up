import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { UPI_ID } from '../config/payments'

/** Where users send UPI payments. Admins edit this in Admin → Controls → Payment settings. */
export type PaymentSettings = {
  upiId: string
  payeeName: string
  /** Shown to users on the payment screen, e.g. "Payments are verified within 2 hours" */
  note?: string
  /** Pause manual UPI payments (e.g. while switching accounts) */
  paused?: boolean
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  upiId: UPI_ID,
  payeeName: 'DateU',
}

const clean = (d: any): PaymentSettings => ({
  upiId: (d?.upiId || DEFAULT_PAYMENT_SETTINGS.upiId).trim(),
  payeeName: (d?.payeeName || DEFAULT_PAYMENT_SETTINGS.payeeName).trim(),
  note: d?.note || '',
  paused: !!d?.paused,
})

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const snap = await getDoc(doc(db, 'config', 'payment'))
    return clean(snap.data())
  } catch {
    return DEFAULT_PAYMENT_SETTINGS
  }
}

export function subscribePaymentSettings(cb: (s: PaymentSettings) => void) {
  return onSnapshot(doc(db, 'config', 'payment'), (snap) => cb(clean(snap.data())), () => cb(DEFAULT_PAYMENT_SETTINGS))
}

/** Standard UPI payment link; every UPI app (and QR scanner) understands it. */
export function upiLink(s: PaymentSettings, amount: number, note = 'DateU Premium') {
  const q = new URLSearchParams({ pa: s.upiId, pn: s.payeeName, am: String(amount), cu: 'INR', tn: note })
  return `upi://pay?${q.toString()}`
}

/** A UPI transaction ID / UTR is 12 digits. */
export const UTR_PATTERN = /^\d{12}$/
