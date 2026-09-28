import { listUserPayments } from './razorpay'
export * from './razorpay'
import { sendNotification } from './notifications'
import { logAdminAction } from './adminTools'

// For backward compatibility if other modules import functions like listUserPayments.
export { listUserPayments }


import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, functions, storage } from '../firebase'

export type Payment = {
  id?: string
  uid: string
  planId: string
  amount: number
  upiId: string
  status: 'pending' | 'approved' | 'rejected' | 'failed'
  proofUrl?: string
  reason?: string
  createdAt?: any
  updatedAt?: any
  referralDiscountApplied?: boolean
  /** UPI transaction ID (UTR) the user entered */
  utr?: string
}

export class DuplicateUtrError extends Error {
  constructor() { super('This UPI transaction ID has already been submitted.') }
}

export async function createPayment(
  p: Omit<Payment, 'status' | 'createdAt' | 'updatedAt' | 'id' | 'reason' | 'proofUrl'> & { utr?: string },
  proofFile?: File
) {
  let proofUrl: string | undefined
  if (proofFile) {
    const r = ref(storage, `payments/${p.uid}/${Date.now()}_${proofFile.name}`)
    await uploadBytes(r, proofFile, { contentType: proofFile.type || 'image/jpeg' })
    proofUrl = await getDownloadURL(r)
  }
  const payRef = doc(collection(db, 'payments'))
  const batch = writeBatch(db)
  batch.set(payRef, {
    ...p,
    ...(proofUrl ? { proofUrl } : {}),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  // Each UPI transaction ID can be used once. The rules only allow creating this
  // doc, so a reused UTR makes the whole write fail.
  if (p.utr) {
    batch.set(doc(db, 'paymentUtrs', p.utr), { uid: p.uid, paymentId: payRef.id, createdAt: serverTimestamp() })
  }
  try {
    await batch.commit()
  } catch (e: any) {
    if (p.utr && (e?.code === 'permission-denied' || /permission/i.test(e?.message || ''))) throw new DuplicateUtrError()
    throw e
  }
  return payRef.id
}

export async function listPendingPayments() {
  const qy = query(collection(db, 'payments'), where('status', '==', 'pending'))
  const snap = await getDocs(qy)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) as Payment }))
}

/**
 * Approve a payment (status flip only). Backend trigger provisions subscription.
 */
export async function approvePayment(paymentId: string) {
  const refp = doc(db, 'payments', paymentId)
  const snap = await getDoc(refp)
  if (!snap.exists()) throw new Error('Payment not found')

  const data = snap.data() as Payment
  if (data.status && data.status !== 'pending') return

  await updateDoc(refp, { status: 'approved', updatedAt: serverTimestamp() })

  // Join round logic...
  try {
    const join = httpsCallable(functions, 'joinMatchingRound')
    await join({}) // the server picks the active round
  } catch {
    // ignore
  }

  // Mark referral discount as used if applicable
  if (data.referralDiscountApplied) {
    await updateDoc(doc(db, 'users', data.uid), {
      referralDiscountUsed: true,
      referralDiscountUsedAt: serverTimestamp()
    })
  }

  await logAdminAction('approve_payment', data.uid, { paymentId, amount: data.amount ?? null })

  // Send Notification
  await sendNotification({
    userUid: data.uid,
    title: 'Payment Approved ✅',
    body: 'Your payment has been approved! You can now participate in matching rounds.'
  })
}

export async function rejectPayment(paymentId: string, reason?: string) {
  const refp = doc(db, 'payments', paymentId)
  await updateDoc(refp, { status: 'rejected', reason: reason || null, updatedAt: serverTimestamp() })

  // Send Notification
  const refSnap = await getDoc(refp)
  if (refSnap.exists()) {
    const data = refSnap.data() as Payment
    await logAdminAction('reject_payment', data.uid, { paymentId, reason: reason || null })
    await sendNotification({
      userUid: data.uid,
      title: 'Payment Rejected ❌',
      body: reason
        ? `Your payment was rejected. Reason: ${reason}`
        : 'Your payment was rejected. Please contact support for details.'
    })
  }
}