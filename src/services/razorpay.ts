import { getApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { FUNCTIONS_REGION } from '../firebase'

function fns() {
  return getFunctions(getApp(), FUNCTIONS_REGION)
}

export async function createOrder(planId: string) {
  const callable = httpsCallable(fns(), 'createRazorpayOrder')
  const res: any = await callable({ planId })
  return res.data
}

export async function verifyPayment(payload: {
  orderId: string
  paymentId: string
  signature: string
  planId: string
}) {
  const callable = httpsCallable(fns(), 'verifyRazorpayPayment')
  const res: any = await callable(payload)
  return res.data as {
    success: boolean
    paymentDocId: string
    subscriptionProvisioned?: boolean
    provisionError?: string
    already?: boolean
  }
}



import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore'

export interface Payment {
  id: string
  uid: string
  planId: string
  amount: number
  gateway: 'razorpay' | string
  status: 'pending' | 'approved' | 'failed' | 'refunded' | string
  subscriptionProvisioned?: boolean
  provisionedAt?: Timestamp
  createdAt?: Timestamp
  updatedAt?: Timestamp
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  // Any dynamic fields
  [k: string]: any
}

interface ListOptions {
  limitTo?: number
  statusIn?: string[]
  order?: 'asc' | 'desc'
}

/**
 * List payments for a specific user.
 * Defaults: order by updatedAt desc.
 */
export async function listUserPayments(
  uid: string,
  opts: ListOptions = {}
): Promise<Payment[]> {
  const db = getFirestore(getApp())
  const col = collection(db, 'payments')

  const statusIn = opts.statusIn
  const parts = [
    where('uid', '==', uid),
  ] as any[]

  // Firestore does not support "in" with dynamic arrays + other sorts simultaneously without proper indexes.
  // If you need multi-status filters, build separate queries or add an index.
  // For now we only handle optional single-status arrays gracefully.
  if (statusIn && statusIn.length === 1) {
    parts.push(where('status', '==', statusIn[0]))
  }

  const direction = opts.order === 'asc' ? 'asc' : 'desc'
  parts.push(orderBy('updatedAt', direction))

  if (opts.limitTo) {
    parts.push(limit(opts.limitTo))
  }

  const q = query(col, ...parts)
  const snap = await getDocs(q)
  const out: Payment[] = []
  snap.forEach(d => {
    out.push({ id: d.id, ...(d.data() as any) })
  })
  return out
}

/**
 * List pending payments for admin (status == 'pending').
 * You can adjust this criteria if "pending" is no longer used.
 */
export async function listPendingPayments(opts: { limitTo?: number } = {}): Promise<Payment[]> {
  const db = getFirestore(getApp())
  const col = collection(db, 'payments')
  const parts = [
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  ] as any[]
  if (opts.limitTo) parts.push(limit(opts.limitTo))
  const q = query(col, ...parts)
  const snap = await getDocs(q)
  const out: Payment[] = []
  snap.forEach(d => out.push({ id: d.id, ...(d.data() as any) }))
  return out
}

/**
 * (Optional helper) Approved but not yet provisioned (should be rare after inline provisioning).
 */
export async function listUnprovisionedApprovedPayments(
  opts: { limitTo?: number } = {}
): Promise<Payment[]> {
  const db = getFirestore(getApp())
  const col = collection(db, 'payments')
  const parts = [
    where('status', '==', 'approved'),
    where('subscriptionProvisioned', '==', false),
    orderBy('updatedAt', 'desc'),
  ] as any[]
  if (opts.limitTo) parts.push(limit(opts.limitTo))
  const q = query(col, ...parts)
  const snap = await getDocs(q)
  const out: Payment[] = []
  snap.forEach(d => out.push({ id: d.id, ...(d.data() as any) }))
  return out
}