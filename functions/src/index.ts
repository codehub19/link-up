import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import Razorpay from 'razorpay'
import * as crypto from 'crypto'
import { defineSecret } from 'firebase-functions/params'

/* -------------------------------------------------------------------------- */
/*  Region & Secrets                                                          */
/* -------------------------------------------------------------------------- */
const REGION = 'asia-south2'
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET')

/* -------------------------------------------------------------------------- */
/*  Admin Initialization                                                      */
/* -------------------------------------------------------------------------- */
if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
interface ActiveSubscription {
  id: string
  remainingMatches?: number
  status?: string
  [k: string]: any
}

async function isRequesterAdmin(uid?: string): Promise<boolean> {
  if (!uid) return false
  const u = await db.collection('users').doc(uid).get()
  return !!u.exists && u.data()?.isAdmin === true
}

async function getActiveSubscription(uid: string): Promise<ActiveSubscription | null> {
  const snap = await db.collection('subscriptions').where('uid', '==', uid).limit(10).get()
  if (snap.empty) return null
  const docs: ActiveSubscription[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  const withRemaining = docs.find(s => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0)
  return withRemaining || docs.find(s => s.status === 'active') || null
}

async function getActiveRoundId(): Promise<string | null> {
  const r = await db.collection('matchingRounds').where('isActive', '==', true).limit(1).get()
  return r.empty ? null : r.docs[0].id
}

async function createOrMergeSubscriptionFromPayment(
  uid: string,
  planId: string,
  fallbackQuota = 0
) {
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const quota = Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0)
  if (!quota || quota <= 0) {
    logger.warn('[provision] No quota found', { planId, hasPlanDoc: planSnap.exists })
    throw new HttpsError('failed-precondition', 'Plan has no quota.')
  }

  const active = await getActiveSubscription(uid)
  const now = admin.firestore.FieldValue.serverTimestamp()

  if (active) {
    await db.collection('subscriptions').doc(active.id).update({
      remainingMatches: admin.firestore.FieldValue.increment(quota),
      updatedAt: now,
    })
    logger.log('[provision] Incremented subscription', { uid, planId, added: quota })
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
    logger.log('[provision] Created subscription', { uid, planId, quota })
  }

  const roundId = await getActiveRoundId()
  if (roundId) {
    const userDoc = await db.collection('users').doc(uid).get()
    const gender = userDoc.exists ? (userDoc.data() as any)?.gender : undefined
    if (gender === 'male' || gender === 'female') {
      const field =
        gender === 'male' ? 'participatingMales' : 'participatingFemales'
      await db.collection('matchingRounds').doc(roundId).update({
        [field]: admin.firestore.FieldValue.arrayUnion(uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Razorpay: create order                                                    */
/* -------------------------------------------------------------------------- */
export const createRazorpayOrder = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req) => {
    const auth = req.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Login required')

    const { planId, amount } = (req.data || {}) as { planId?: string; amount?: number }
    if (!planId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', 'planId and positive amount required')
    }

    const key_id = RAZORPAY_KEY_ID.value()
    const key_secret = RAZORPAY_KEY_SECRET.value()
    if (!key_id || !key_secret) {
      logger.error('createRazorpayOrder_missing_secrets', { hasKeyId: !!key_id, hasKeySecret: !!key_secret })
      throw new HttpsError('failed-precondition', 'Payment service unavailable')
    }

    // Short, unique receipt <= 40 chars
    function buildReceipt(p: string, uid: string) {
      const uid6 = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'user'
      const ts = Date.now().toString(36) // compact base36 timestamp
      const raw = `p_${p}_${uid6}_${ts}` // usually < 30 chars
      return raw.length <= 40 ? raw : raw.slice(0, 40)
    }
    const receipt = buildReceipt(planId, auth.uid)

    logger.log('createRazorpayOrder_input', { uid: auth.uid, planId, amount, receipt })

    try {
      const client = new Razorpay({ key_id, key_secret })
      const order = await client.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt,
        notes: {
          uid: auth.uid,
          planId,
          // You can add a version marker if needed
          v: '1'
        }
      })

      logger.log('createRazorpayOrder_success', {
        uid: auth.uid,
        planId,
        orderId: order.id,
        receipt: order.receipt,
        amountPaise: order.amount
      })

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: key_id
      }
    } catch (e: any) {
      const rz = e?.error || {}
      logger.error('createRazorpayOrder_failed', {
        uid: auth.uid,
        planId,
        amount,
        name: e?.name,
        message: e?.message,
        statusCode: e?.statusCode || rz?.statusCode,
        description: rz?.description,
        code: rz?.code,
        raw: rz
      })
      const clientMsg =
        typeof rz?.description === 'string'
          ? `Order failed: ${rz.description}`
          : 'Failed to create order.'
      throw new HttpsError('internal', clientMsg)
    }
  }
)

/* -------------------------------------------------------------------------- */
/*  Razorpay: verify payment                                                  */
/* -------------------------------------------------------------------------- */
export const verifyRazorpayPayment = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req) => {
    const auth = req.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Login required')

    const { orderId, paymentId, signature, planId, amount } = (req.data || {}) as {
      orderId?: string
      paymentId?: string
      signature?: string
      planId?: string
      amount?: number
    }

    if (
      !orderId ||
      !paymentId ||
      !signature ||
      !planId ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new HttpsError('invalid-argument', 'Invalid verification payload')
    }

    const key_secret = RAZORPAY_KEY_SECRET.value()
    if (!key_secret) throw new HttpsError('failed-precondition', 'Payment service not configured')

    const expected = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expected !== signature) {
      logger.warn('verify_signature_mismatch', { orderId, paymentId, uid: auth.uid })
      throw new HttpsError('permission-denied', 'Signature mismatch')
    }

    const payments = db.collection('payments')
    const existing = await payments
      .where('uid', '==', auth.uid)
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get()

    const base = {
      uid: auth.uid,
      planId,
      amount,
      gateway: 'razorpay',
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: 'approved',
      subscriptionProvisioned: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    let paymentDocId: string
    if (existing.empty) {
      const ref = await payments.add({
        ...base,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      paymentDocId = ref.id
    } else {
      await existing.docs[0].ref.update(base)
      paymentDocId = existing.docs[0].id
    }

    logger.log('verify_payment_success', {
      uid: auth.uid,
      planId,
      orderId,
      paymentId,
      paymentDocId,
    })

    return { success: true, paymentDocId }
  }
)

/* -------------------------------------------------------------------------- */
/*  Matching & Admin Callables                                                */
/* -------------------------------------------------------------------------- */
export const joinMatchingRound = onCall({ region: REGION }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')
  const { roundId } = (req.data || {}) as { roundId?: string }
  if (!roundId) throw new HttpsError('invalid-argument', 'roundId is required')

  const userRef = db.collection('users').doc(auth.uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'User profile missing')

  const gender = userSnap.data()?.gender
  if (gender !== 'male' && gender !== 'female') {
    throw new HttpsError('failed-precondition', 'Gender missing')
  }

  const field = gender === 'male' ? 'participatingMales' : 'participatingFemales'
  await db.collection('matchingRounds').doc(roundId).update({
    [field]: admin.firestore.FieldValue.arrayUnion(auth.uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { ok: true }
})

export const confirmMatch = onCall({ region: REGION }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { roundId, girlUid } = (req.data || {}) as { roundId?: string; girlUid?: string }
  if (!roundId || !girlUid) {
    throw new HttpsError('invalid-argument', 'roundId and girlUid are required')
  }

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

export const adminPromoteMatch = onCall({ region: REGION }, async (req) => {
  const caller = req.auth?.uid
  if (!(await isRequesterAdmin(caller))) {
    throw new HttpsError('permission-denied', 'Admin only')
  }

  const { roundId, boyUid, girlUid } = (req.data || {}) as {
    roundId?: string
    boyUid?: string
    girlUid?: string
  }
  if (!roundId || !boyUid || !girlUid) {
    throw new HttpsError('invalid-argument', 'roundId, boyUid, girlUid required')
  }

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

export const adminApprovePayment = onCall({ region: REGION }, async (req) => {
  const caller = req.auth?.uid
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required')
  if (!(await isRequesterAdmin(caller))) {
    throw new HttpsError('permission-denied', 'Admin only')
  }

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

  try {
    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota)
    await payRef.set(
      {
        subscriptionProvisioned: true,
        provisionedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (e: any) {
    logger.error('[adminApprovePayment] provision failed', {
      paymentId,
      error: e?.message,
    })
  }

  return { ok: true }
})

/* -------------------------------------------------------------------------- */
/*  Trigger: Payment Approved                                                 */
/* -------------------------------------------------------------------------- */
export const onPaymentApproved = onDocumentUpdated(
  { document: 'payments/{paymentId}', region: REGION },
  async (event) => {
    const change: Change<DocumentSnapshot> | undefined = event.data
    if (!change) return
    const before = change.before.data() as any | undefined
    const after = change.after.data() as any | undefined
    if (!after) return

    if (before?.status === 'approved') return
    if (after.status !== 'approved') return
    if (after.subscriptionProvisioned === true) return

    const uid = after.uid as string
    const planId = after.planId as string
    if (!uid || !planId) return

    const fallbackQuota = Number(after.matchQuota ?? after.quota ?? 0)
    const paymentRef = change.after.ref
    const paymentId = event.params.paymentId

    try {
      await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota)
      await paymentRef.set(
        {
          subscriptionProvisioned: true,
          provisionedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      logger.log('[onPaymentApproved] subscription provisioned', {
        paymentId,
        uid,
        planId,
      })
    } catch (e: any) {
      logger.error('[onPaymentApproved] failed', { paymentId, error: e?.message })
      await paymentRef.set({ provisionError: e?.message || String(e) }, { merge: true })
    }
  }
)