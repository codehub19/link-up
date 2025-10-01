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
    .limit(10)
    .get()

  if (snap.empty) return null

  // Prefer a sub that is active and has remainingMatches > 0
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  const withRemaining = docs.find(s => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0)
  const anyActive = withRemaining || docs.find(s => s.status === 'active')
  return anyActive || null
}

async function getActiveRoundId(): Promise<string | null> {
  // This repo uses isActive on rounds
  const r = await db.collection('matchingRounds').where('isActive', '==', true).limit(1).get()
  return r.empty ? null : r.docs[0].id
}

async function createOrMergeSubscriptionFromPayment(uid: string, planId: string, fallbackQuota = 0) {
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const quota = Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0)

  if (!quota || quota <= 0) {
    console.log('[provision] No quota found', { planId, hasPlanDoc: !!planSnap.exists, fallbackQuota })
    throw new HttpsError('failed-precondition', 'Plan has no quota (matchQuota/quota missing).')
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

  // Best-effort join round – respect gender
  const roundId = await getActiveRoundId()
  if (roundId) {
    const userDoc = await db.collection('users').doc(uid).get()
    const gender = userDoc.exists ? (userDoc.data() as any)?.gender : undefined
    const roundRef = db.collection('matchingRounds').doc(roundId)
    const update: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() }

    if (gender === 'male') {
      update.participatingMales = admin.firestore.FieldValue.arrayUnion(uid)
    } else if (gender === 'female') {
      update.participatingFemales = admin.firestore.FieldValue.arrayUnion(uid)
    } else {
      // Unknown gender: do not add to any gendered list
      console.log('[provision] Skipped adding to participants due to missing/unknown gender', { uid })
    }

    if (update.participatingMales || update.participatingFemales) {
      await roundRef.update(update)
    }
  }
}

/**
 * Join active round – region pinned to us-central1
 */
export const joinMatchingRound = onCall({ region: 'us-central1' }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { roundId } = (req.data || {}) as { roundId?: string }
  if (!roundId) throw new HttpsError('invalid-argument', 'roundId is required')

  const userRef = db.collection('users').doc(auth.uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'User profile missing')

  const gender = userSnap.data()?.gender
  if (gender !== 'male' && gender !== 'female') throw new HttpsError('failed-precondition', 'Gender missing')

  const field = gender === 'male' ? 'participatingMales' : 'participatingFemales'
  await db
    .collection('matchingRounds')
    .doc(roundId)
    .update({
      [field]: admin.firestore.FieldValue.arrayUnion(auth.uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

  return { ok: true }
})

/**
 * Boy confirms a girl's like – enforces subscription quota (us-central1)
 */
export const confirmMatch = onCall({ region: 'us-central1' }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { roundId, girlUid } = (req.data || {}) as { roundId?: string; girlUid?: string }
  if (!roundId || !girlUid) throw new HttpsError('invalid-argument', 'roundId and girlUid are required')

  const boyUid = auth.uid
  const sub = await getActiveSubscription(boyUid)
  if (!sub || (sub.remainingMatches ?? 0) <= 0) {
    throw new HttpsError('failed-precondition', 'No active subscription or quota exhausted')
  }

  const likeId = `${roundId}_${girlUid}_${boyUid}`
  const likeRef = db.collection('likes').doc(likeId)
  const likeSnap = await likeRef.get()
  if (!likeSnap.exists) throw new HttpsError('failed-precondition', 'Like not found')

  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = db.collection('matches').doc(matchId)
  const subRef = db.collection('subscriptions').doc(sub.id)
  const roundRef = db.collection('matchingRounds').doc(roundId)

  await db.runTransaction(async (tx) => {
    const [mSnap, sSnap] = await Promise.all([tx.get(matchRef), tx.get(subRef)])
    if (mSnap.exists) return

    const curr = sSnap.data() as any
    const remaining = Number(curr?.remainingMatches ?? 0)
    if (remaining <= 0) throw new HttpsError('failed-precondition', 'Quota exhausted')

    tx.set(
      matchRef,
      {
        roundId,
        participants: [boyUid, girlUid],
        boyUid,
        girlUid,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const next = remaining - 1
    tx.update(subRef, {
      remainingMatches: next,
      status: next <= 0 ? 'expired' : 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    if (next <= 0) {
      tx.update(roundRef, {
        participatingMales: admin.firestore.FieldValue.arrayRemove(boyUid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  })

  return { ok: true }
})

/**
 * Admin promotes to match – enforces boy's subscription quota (us-central1)
 */
export const adminPromoteMatch = onCall({ region: 'us-central1' }, async (req) => {
  const caller = req.auth?.uid
  if (!(await isRequesterAdmin(caller))) throw new HttpsError('permission-denied', 'Admin only')

  const { roundId, boyUid, girlUid } = (req.data || {}) as { roundId?: string; boyUid?: string; girlUid?: string }
  if (!roundId || !boyUid || !girlUid) throw new HttpsError('invalid-argument', 'roundId, boyUid, girlUid required')

  const sub = await getActiveSubscription(boyUid)
  if (!sub || (sub.remainingMatches ?? 0) <= 0) {
    throw new HttpsError('failed-precondition', 'Boy has no active subscription or quota exhausted')
  }

  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = db.collection('matches').doc(matchId)
  const subRef = db.collection('subscriptions').doc(sub.id)
  const roundRef = db.collection('matchingRounds').doc(roundId)

  await db.runTransaction(async (tx) => {
    const [mSnap, sSnap] = await Promise.all([tx.get(matchRef), tx.get(subRef)])
    if (mSnap.exists) return

    const curr = sSnap.data() as any
    const remaining = Number(curr?.remainingMatches ?? 0)
    if (remaining <= 0) throw new HttpsError('failed-precondition', 'Quota exhausted')

    tx.set(
      matchRef,
      {
        roundId,
        participants: [boyUid, girlUid],
        boyUid,
        girlUid,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const next = remaining - 1
    tx.update(subRef, {
      remainingMatches: next,
      status: next <= 0 ? 'expired' : 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    if (next <= 0) {
      tx.update(roundRef, {
        participatingMales: admin.firestore.FieldValue.arrayRemove(boyUid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  })

  return { ok: true }
})

/**
 * Admin approves a payment and provisions subscription immediately (us-central1)
 * (This repo version calls createOrMergeSubscriptionFromPayment and then best-effort joins round.)
 */
export const adminApprovePayment = onCall({ region: 'us-central1' }, async (req) => {
  const caller = req.auth?.uid
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required')
  if (!(await isRequesterAdmin(caller))) throw new HttpsError('permission-denied', 'Admin only')

  const paymentId = (req.data as any)?.paymentId as string
  if (!paymentId) throw new HttpsError('invalid-argument', 'paymentId is required')

  const payRef = db.collection('payments').doc(paymentId)
  const snap = await payRef.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Payment not found')

  const p = snap.data() as any
  const uid = String(p.uid || '')
  const planId = String(p.planId || '')
  const fallbackQuota = Number(p.matchQuota ?? p.quota ?? 0)
  if (!uid || !planId) throw new HttpsError('failed-precondition', 'Payment missing uid/planId')

  await payRef.update({
    status: 'approved',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota)

  return { ok: true }
})

/**
 * Firestore trigger on payments → approved (asia-south2 in this repo)
 */
export const onPaymentApproved = onDocumentUpdated(
  { document: 'payments/{paymentId}', region: 'asia-south2' },
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