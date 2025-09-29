import {
  addDoc, collection, doc, getDoc, serverTimestamp, updateDoc,
  getDocs, query, where, limit,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, storage } from '../firebase'
import { getActiveRound } from './rounds'
import { arrayUnion, increment } from 'firebase/firestore'

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
  const qy = query(collection(db, 'payments'), where('status', '==', 'pending'))
  const snap = await getDocs(qy)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) as Payment }))
}

/**
 * Legacy approve: flips status and best-effort join round via callable.
 */
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
    await join({ roundId: active.id })
  } catch {
    // ignore
  }
}

/**
 * New approve that also provisions a subscription on the client (Admin only via rules).
 * - Sets payment approved
 * - Adds/increments subscriptions remainingMatches from plan.matchQuota/quota
 * - Adds the user to active round's participatingMales
 */
export async function approveAndProvisionPayment(paymentId: string) {
  // Fetch payment
  const payRef = doc(db, 'payments', paymentId)
  const paySnap = await getDoc(payRef)
  if (!paySnap.exists()) throw new Error('Payment not found')
  const p = paySnap.data() as Payment
  if (!p.uid || !p.planId) throw new Error('Payment missing uid or planId')

  // Get plan
  const planRef = doc(db, 'plans', p.planId)
  const planSnap = await getDoc(planRef)
  let quota = 0
  if (planSnap.exists()) {
    const pd = planSnap.data() as any
    quota = Number(pd.matchQuota ?? pd.quota ?? 0)
  }
  if (!quota) quota = Number((p as any).matchQuota ?? (p as any).quota ?? 0)
  quota = Math.floor(Number(quota || 0))
  if (!quota || quota <= 0) throw new Error('Plan has no matchQuota/quota configured')

  // Approve payment
  await updateDoc(payRef, { status: 'approved', updatedAt: serverTimestamp() })

  // Find existing active subscription
  const subQ = query(
    collection(db, 'subscriptions'),
    where('uid', '==', p.uid),
    where('status', '==', 'active'),
    limit(1)
  )
  const subSnap = await getDocs(subQ)

  if (!subSnap.empty) {
    const subRef = doc(db, 'subscriptions', subSnap.docs[0].id)
    await updateDoc(subRef, {
      remainingMatches: increment(quota),
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(collection(db, 'subscriptions'), {
      uid: p.uid,
      planId: p.planId,
      status: 'active',
      matchQuota: quota,
      remainingMatches: quota,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  // Add male to active round (best effort)
  try {
    const active = await getActiveRound()
    if (active?.id) {
      const roundRef = doc(db, 'matchingRounds', active.id)
      await updateDoc(roundRef, {
        participatingMales: arrayUnion(p.uid),
        updatedAt: serverTimestamp(),
      })
    }
  } catch {
    // non-fatal
  }
}

export async function rejectPayment(paymentId: string, reason?: string) {
  const ref = doc(db, 'payments', paymentId)
  await updateDoc(ref, { status: 'rejected', updatedAt: serverTimestamp(), reason: reason || null })
}