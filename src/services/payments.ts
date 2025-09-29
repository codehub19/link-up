import {
  addDoc, collection, doc, getDoc, serverTimestamp, updateDoc,
  getDocs, query, where,
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
  status: 'pending' | 'approved' | 'rejected'
  proofUrl?: string
  createdAt?: any
  updatedAt?: any
}

export async function createPayment(p: Omit<Payment,'status'|'createdAt'|'updatedAt'|'id'>, proofFile?: File) {
  let proofUrl: string | undefined = undefined
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
  const q = query(collection(db, 'payments'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) as Payment }))
}

export async function approvePayment(paymentId: string) {
  const ref = doc(db, 'payments', paymentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Payment not found')
  const data = snap.data() as Payment
  await updateDoc(ref, { status: 'approved', updatedAt: serverTimestamp() })

  try {
    const fns = getFunctions()
    const join = httpsCallable(fns, 'joinMatchingRound')
    const active = await getActiveRound()
    if (!active) throw new Error('No active round')
    await join({ roundId: active.id, planId: data.planId })
  } catch {
    // Fallback handled elsewhere if needed
  }
}

export async function rejectPayment(paymentId: string, reason?: string) {
  const ref = doc(db, 'payments', paymentId)
  await updateDoc(ref, { status: 'rejected', updatedAt: serverTimestamp(), reason: reason || null })
}