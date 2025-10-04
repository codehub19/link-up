import { getApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { Plan } from '../config/payments'
import { FUNCTIONS_REGION } from '../firebase'  // you exported this earlier

const app = getApp()
const db = getFirestore(app)

function fns() {
  return getFunctions(app, FUNCTIONS_REGION)
}

export async function createOrder(plan: Plan) {
  const callable = httpsCallable(fns(), 'createRazorpayOrder')
  const res: any = await callable({ planId: plan.id, amount: plan.amount })
  return res.data as { orderId: string; amount: number; currency: string; keyId: string }
}

export async function verifyPayment(params: {
  orderId: string
  paymentId: string
  signature: string
  planId: string
  amount: number
}) {
  const callable = httpsCallable(fns(), 'verifyRazorpayPayment')
  const res: any = await callable(params)
  return res.data as { success: boolean; paymentDocId: string }
}

export type PaymentRecord = {
  id: string
  uid: string
  planId: string
  amount: number
  status: string
  gateway: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  createdAt?: any
  updatedAt?: any
  provisionedAt?: any
  subscriptionProvisioned?: boolean
}

export async function listUserPayments(uid: string, max = 10): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, 'payments'),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}