import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

async function isRequesterAdmin(uid?: string) {
  if (!uid) return false
  const u = await db.collection('users').doc(uid).get()
  return !!u.exists && u.data()?.isAdmin === true
}

async function getActiveSubscription(uid: string) {
  const snap = await db
    .collection('subscriptions')
    .where('uid', '==', uid)
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as any
}

async function getActiveRoundId(): Promise<string | null> {
  const r = await db.collection('matchingRounds').where('isActive', '==', true).limit(1).get()
  return r.empty ? null : r.docs[0].id
}

async function createOrMergeSubscriptionFromPayment(uid: string, planId: string, fallbackQuota = 0) {
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const quota = Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0)

  if (!quota || quota <= 0) {
    console.log('No quota found for planId', planId, 'planDoc?', !!planSnap.exists, 'fallbackQuota', fallbackQuota)
    return
  }

  const active = await getActiveSubscription(uid)
  const now = admin.firestore.FieldValue.serverTimestamp()

  if (active) {
    await db.collection('subscriptions').doc(active.id).update({
      remainingMatches: admin.firestore.FieldValue.increment(quota),
      updatedAt: now,
    })
  } else {
    await db.collection('subscriptions').add({
      uid,
      planId,
      status: 'active',
      matchQuota: quota,
      remainingMatches: quota,
      supportAvailable: !!plan?.supportAvailable,
      createdAt: now,
      updatedAt: now,
    })
  }

  const roundId = await getActiveRoundId()
  if (roundId) {
    await db.collection('matchingRounds').doc(roundId).update({
      participatingMales: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
}

// 1) New: Admin approves a payment and provisions subscription immediately
export const adminApprovePayment = onCall(async (req) => {
  const caller = req.auth?.uid
  if (!await isRequesterAdmin(caller)) throw new HttpsError('permission-denied', 'Admin only')

  const { paymentId } = (req.data || {}) as { paymentId?: string }
  if (!paymentId) throw new HttpsError('invalid-argument', 'paymentId is required')

  const payRef = db.collection('payments').doc(paymentId)
  const snap = await payRef.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Payment not found')

  const p = snap.data() as any
  const uid = String(p.uid || '')
  const planId = String(p.planId || '')
  const fallbackQuota = Number(p.matchQuota ?? p.quota ?? 0)
  if (!uid || !planId) throw new HttpsError('failed-precondition', 'Payment missing uid/planId')

  // Set status to approved (if not already), then provision
  await payRef.update({
    status: 'approved',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota)

  return { ok: true }
})

// 2) Keep the trigger as a safety net (ensure region matches your Firestore region)
export const onPaymentApproved = onDocumentUpdated(
  {
    document: 'payments/{paymentId}',
    region: 'asia-south2',
  },
  async (event) => {
    const before = event.data?.before?.data() as any
    const after = event.data?.after?.data() as any
    if (!after) return
    if (before?.status === 'approved' || after?.status !== 'approved') return

    const uid = after.uid as string
    const planId = after.planId as string
    const fallbackQuota = Number(after.matchQuota ?? after.quota ?? 0)
    if (!uid || !planId) return

    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota)
  }
)