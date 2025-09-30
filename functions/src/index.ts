import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

// Helpers
async function isRequesterAdmin(uid?: string) {
  if (!uid) return false
  const u = await db.collection('users').doc(uid).get()
  return !!u.exists && u.data()?.isAdmin === true
}

// Prefer a sub that is active and has remaining > 0
async function getActiveSubscription(uid: string) {
  const snap = await db.collection('subscriptions').where('uid', '==', uid).limit(10).get()
  if (snap.empty) return null
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  const withRemaining = docs.find((s) => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0)
  const anyActive = withRemaining || docs.find((s) => s.status === 'active')
  return anyActive || null
}

// Admin UI uses "active" flag on rounds
async function getActiveRoundId(): Promise<string | null> {
  const r = await db.collection('matchingRounds').where('active', '==', true).limit(1).get()
  return r.empty ? null : r.docs[0].id
}

// Provisioning by payment (single source, idempotent, exact quota)
async function provisionSubscriptionFromPayment(paymentId: string) {
  const pRef = db.collection('payments').doc(paymentId)
  const pSnap = await pRef.get()
  if (!pSnap.exists) throw new HttpsError('not-found', 'Payment not found')

  const p = pSnap.data() as any
  if (p.status !== 'approved') return
  if (p.subscriptionId) return // already provisioned

  const uid = String(p.uid || '')
  const planId = String(p.planId || '')
  if (!uid || !planId) throw new HttpsError('failed-precondition', 'Payment missing uid or planId')

  const planSnap = await db.collection('plans').doc(planId).get()
  if (!planSnap.exists) throw new HttpsError('failed-precondition', 'Plan not found')
  const plan = planSnap.data() as any

  const quota = Math.max(1, Math.floor(Number(plan?.matchQuota ?? plan?.quota ?? 1)))
  const supportAvailable = !!plan?.supportAvailable
  const now = admin.firestore.FieldValue.serverTimestamp()

  // Lock to avoid concurrent duplicate provisioning
  const lockRef = db.collection('paymentLocks').doc(paymentId)
  try {
    await lockRef.create({ createdAt: now })
  } catch {
    return // someone else is provisioning or already done
  }

  // Expire any active subs and create fresh with EXACT remainingMatches
  const subsSnap = await db.collection('subscriptions').where('uid', '==', uid).limit(20).get()
  const batch = db.batch()
  subsSnap.forEach((d) => {
    const s = d.data() as any
    if (s.status === 'active') batch.update(d.ref, { status: 'expired', updatedAt: now })
  })
  await batch.commit()

  const subRef = await db.collection('subscriptions').add({
    uid,
    planId,
    status: 'active',
    matchQuota: quota,
    remainingMatches: quota,
    supportAvailable,
    createdAt: now,
    updatedAt: now,
  })

  // Link payment for idempotency
  await pRef.update({ subscriptionId: subRef.id, updatedAt: now })

  // Best-effort: add to active round
  const roundId = await getActiveRoundId()
  if (roundId) {
    await db.collection('matchingRounds').doc(roundId).update({
      participatingMales: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: now,
    })
  }
}

// Back-compat helper if anything else calls it directly (exact-quota behavior)
async function createOrMergeSubscriptionFromPayment(uid: string, planId: string, fallbackQuota = 0) {
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const quota = Math.max(1, Math.floor(Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0)))
  if (!quota) throw new HttpsError('failed-precondition', 'Plan has no quota')

  const now = admin.firestore.FieldValue.serverTimestamp()

  const subsSnap = await db.collection('subscriptions').where('uid', '==', uid).limit(20).get()
  const batch = db.batch()
  subsSnap.forEach((d) => {
    const s = d.data() as any
    if (s.status === 'active') batch.update(d.ref, { status: 'expired', updatedAt: now })
  })
  await batch.commit()

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

  const roundId = await getActiveRoundId()
  if (roundId) {
    await db.collection('matchingRounds').doc(roundId).update({
      participatingMales: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: now,
    })
  }
}

// Trigger: provision once when a payment becomes approved
export const paymentApprovedProvision = onDocumentUpdated('payments/{id}', async (event) => {
  const before = event.data?.before?.data() as any
  const after = event.data?.after?.data() as any
  if (!after) return
  const becameApproved = before?.status !== 'approved' && after?.status === 'approved'
  if (!becameApproved) return
  if (after.subscriptionId) return
  await provisionSubscriptionFromPayment(event.params.id)
})

// Join active round (us-central1)
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

  await db.collection('matchingRounds').doc(roundId).update({
    [gender === 'male' ? 'participatingMales' : 'participatingGirls']: admin.firestore.FieldValue.arrayUnion(auth.uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { ok: true }
})

// Confirm match – enforces and decrements quota atomically
export const confirmMatch = onCall({ region: 'us-central1' }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { roundId, girlUid } = (req.data || {}) as { roundId?: string; girlUid?: string }
  const boyUid = auth.uid
  if (!roundId || !girlUid) throw new HttpsError('invalid-argument', 'roundId and girlUid are required')

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

// Admin promotes to match – enforces and decrements quota atomically
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