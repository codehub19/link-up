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
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, storage } from '../firebase'
import { getActiveRound } from './rounds'

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
}

export async function createPayment(
  p: Omit<Payment, 'status' | 'createdAt' | 'updatedAt' | 'id' | 'reason' | 'proofUrl'>,
  proofFile?: File
) {
  let proofUrl: string | undefined
  if (proofFile) {
    const r = ref(storage, `payments/${p.uid}/${Date.now()}_${proofFile.name}`)
    await uploadBytes(r, proofFile, { contentType: proofFile.type || 'image/jpeg' })
    proofUrl = await getDownloadURL(r)
  }
  const docRef = await addDoc(collection(db, 'payments'), {
    ...p,
    proofUrl,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
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

  // Optional: join active round (best-effort)
  try {
    const fns = getFunctions()
    const join = httpsCallable(fns, 'joinMatchingRound')
    const active = await getActiveRound()
    if (active?.id) await join({ roundId: active.id })
  } catch {
    // ignore
  }
}

export async function rejectPayment(paymentId: string, reason?: string) {
  const refp = doc(db, 'payments', paymentId)
  await updateDoc(refp, { status: 'rejected', reason: reason || null, updatedAt: serverTimestamp() })
}