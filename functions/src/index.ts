// Must be imported first so the options apply to every function below
import './options'
import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  onDocumentUpdated,
  Change,
  DocumentSnapshot,
} from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import Razorpay from 'razorpay'
import * as crypto from 'crypto'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from 'firebase-functions/v2/scheduler'
import axios from 'axios'
import { isUserAdmin, sendPushToUsers } from './push'
import { DEFAULT_PREMIUM_DAYS, getActivePremium, grantPremiumDays } from './premium'

/* ----------------------------------------------------------------------------
 * Region & Secrets
 * ------------------------------------------------------------------------- */
const REGION = 'asia-south2'

// Set with:
//   firebase functions:secrets:set RAZORPAY_KEY_ID
//   firebase functions:secrets:set RAZORPAY_KEY_SECRET
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET')

/* ----------------------------------------------------------------------------
 * Firebase Admin Initialization
 * ------------------------------------------------------------------------- */
if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */
interface ActiveSubscription {
  id: string
  remainingMatches?: number
  status?: string
  [k: string]: any
}

/* ----------------------------------------------------------------------------
 * Helper Functions
 * ------------------------------------------------------------------------- */

/*notification function to send push notification to multiple users*/
// ... imports and init ...

// Push notification to a list of users (admin only: rounds, payments, support replies)
export const sendPushNotification = onCall({ region: REGION }, async (req) => {
  if (!(await isUserAdmin(req.auth?.uid))) {
    throw new HttpsError('permission-denied', 'Admin only')
  }
  const { userUids, title, body } = (req.data || {}) as { userUids?: string[]; title?: string; body?: string }
  if (!Array.isArray(userUids) || !title || !body) {
    throw new HttpsError('invalid-argument', 'userUids, title and body are required')
  }
  const sent = await sendPushToUsers(userUids, String(title), String(body))
  return { sent }
})

async function isRequesterAdmin(uid?: string): Promise<boolean> {
  if (!uid) return false
  const snap = await db.collection('users').doc(uid).get()
  return !!snap.exists && snap.data()?.isAdmin === true
}

async function getActiveSubscription(uid: string): Promise<ActiveSubscription | null> {
  return (await getActivePremium(uid)) as ActiveSubscription | null
}

async function getActiveRoundId(): Promise<string | null> {
  const r = await db.collection('matchingRounds')
    .where('isActive', '==', true)
    .limit(1)
    .get()
  return r.empty ? null : r.docs[0].id
}

async function createOrMergeSubscriptionFromPayment(
  uid: string,
  planId: string,
  _legacyQuota = 0
) {
  // Premium is time-based: it gives priority in rounds and calls, not a number of matches.
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const days = Number(plan?.durationDays) > 0 ? Number(plan.durationDays) : DEFAULT_PREMIUM_DAYS

  const res = await grantPremiumDays(uid, planId, days, { supportAvailable: !!plan?.supportAvailable })
  logger.log('[provision] Premium granted', { uid, planId, days, subscriptionId: res.subscriptionId })

  // Auto-join current active round (best effort)
  const roundId = await getActiveRoundId()
  if (roundId) {
    const userDoc = await db.collection('users').doc(uid).get()
    const gender = userDoc.exists ? (userDoc.data() as any)?.gender : undefined
    if (gender === 'male' || gender === 'female') {
      const field = gender === 'male' ? 'participatingMales' : 'participatingFemales'
      await db.collection('matchingRounds').doc(roundId).update({
        [field]: admin.firestore.FieldValue.arrayUnion(uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  }
}

/* ----------------------------------------------------------------------------
 * Razorpay: Create Order (amount derived from Firestore Plan)
 * ------------------------------------------------------------------------- */
export const createRazorpayOrder = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req) => {
    const auth = req.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Login required')

    const { planId } = (req.data || {}) as { planId?: string }
    if (!planId) throw new HttpsError('invalid-argument', 'planId required')

    // Securely fetch plan
    const planSnap = await db.collection('plans').doc(planId).get()
    if (!planSnap.exists) throw new HttpsError('not-found', 'Plan not found')
    const plan = planSnap.data() as any
    if (plan.active !== true) throw new HttpsError('failed-precondition', 'Plan inactive')

    const amount = Number(plan.price ?? plan.amount)
    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      throw new HttpsError('failed-precondition', 'Plan has invalid price')
    }

    const key_id = RAZORPAY_KEY_ID.value()
    const key_secret = RAZORPAY_KEY_SECRET.value()
    if (!key_id || !key_secret) {
      logger.error('createRazorpayOrder_missing_secrets', { hasKeyId: !!key_id, hasKeySecret: !!key_secret })
      throw new HttpsError('failed-precondition', 'Payment service unavailable')
    }

    // Short receipt <= 40 chars
    function buildReceipt(p: string, uid: string) {
      const uid6 = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'user'
      const ts = Date.now().toString(36)
      const raw = `p_${p}_${uid6}_${ts}`
      return raw.length <= 40 ? raw : raw.slice(0, 40)
    }
    const receipt = buildReceipt(planId, auth.uid)

    logger.log('createRazorpayOrder_input', {
      uid: auth.uid,
      planId,
      amount,
      receipt,
    })

    try {
      const client = new Razorpay({ key_id, key_secret })
      const order = await client.orders.create({
        amount: Math.round(amount * 100),
        currency: (plan.currency || 'INR') as string,
        receipt,
        notes: {
          uid: auth.uid,
          planId,
          quota: plan.matchQuota ?? '',
          v: '1',
        },
      })

      logger.log('createRazorpayOrder_success', {
        uid: auth.uid,
        planId,
        orderId: order.id,
        receipt: order.receipt,
        amountPaise: order.amount,
      })

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: key_id,
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
        raw: rz,
      })
      const clientMsg = typeof rz?.description === 'string'
        ? `Order failed: ${rz.description}`
        : 'Failed to create order.'
      throw new HttpsError('internal', clientMsg)
    }
  }
)
/* ----------------------------------------------------------------------------
 * Razorpay: Verify + Provision (Option A: inline provisioning)
 * ------------------------------------------------------------------------- */
export const verifyRazorpayPayment = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req) => {
    const auth = req.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Login required')

    const { orderId, paymentId, signature, planId } = (req.data || {}) as {
      orderId?: string
      paymentId?: string
      signature?: string
      planId?: string
    }

    if (!orderId || !paymentId || !signature || !planId) {
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

    // Fetch plan info (for amount logging & plan validation)
    let planPrice: number | undefined
    let planQuota: number | undefined
    try {
      const pSnap = await db.collection('plans').doc(planId).get()
      if (!pSnap.exists) throw new Error('Plan not found')
      const pdata = pSnap.data() as any
      if (pdata.active !== true) throw new Error('Plan inactive')
      planPrice = Number(pdata.price ?? pdata.amount)
      planQuota = Number(pdata.matchQuota ?? pdata.quota)
    } catch (e: any) {
      logger.error('verify_plan_fetch_failed', {
        planId,
        error: e?.message,
      })
      // Proceed; provisioning attempt may still succeed if quota resolved
    }

    const payments = db.collection('payments')
    const existing = await payments
      .where('uid', '==', auth.uid)
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get()

    const nowTs = admin.firestore.FieldValue.serverTimestamp()
    let paymentDocRef: FirebaseFirestore.DocumentReference
    let existingData: any | undefined

    const base = {
      uid: auth.uid,
      planId,
      amount: planPrice ?? 0,
      gateway: 'razorpay',
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: 'approved',
      subscriptionProvisioned: false,
      updatedAt: nowTs,
      planSnapshot: {
        price: planPrice ?? null,
        quota: planQuota ?? null,
      },
    }

    if (existing.empty) {
      // FIX: remove .ref (add returns a DocumentReference directly)
      paymentDocRef = await payments.add({
        ...base,
        createdAt: nowTs,
      })
    } else {
      paymentDocRef = existing.docs[0].ref
      existingData = existing.docs[0].data()
      await paymentDocRef.update(base)
    }

    if (existingData?.subscriptionProvisioned === true) {
      logger.log('verify_payment_already_provisioned', {
        uid: auth.uid,
        planId,
        orderId,
        paymentId,
        paymentDocId: paymentDocRef.id,
      })
      return {
        success: true,
        paymentDocId: paymentDocRef.id,
        already: true,
        subscriptionProvisioned: true,
      }
    }

    try {
      await createOrMergeSubscriptionFromPayment(auth.uid, planId, 0)
      await paymentDocRef.set(
        {
          subscriptionProvisioned: true,
          provisionedAt: nowTs,
          updatedAt: nowTs,
        },
        { merge: true }
      )
      logger.log('verify_payment_provisioned', {
        uid: auth.uid,
        planId,
        orderId,
        paymentId,
        paymentDocId: paymentDocRef.id,
      })
      return {
        success: true,
        paymentDocId: paymentDocRef.id,
        subscriptionProvisioned: true,
      }
    } catch (e: any) {
      logger.error('verify_payment_provision_failed', {
        uid: auth.uid,
        planId,
        orderId,
        paymentId,
        paymentDocId: paymentDocRef.id,
        error: e?.message,
      })
      return {
        success: true,
        paymentDocId: paymentDocRef.id,
        subscriptionProvisioned: false,
        provisionError: e?.message,
      }
    }
  }
)



export const checkInstagramUsername = onRequest(
  { region: "asia-south2" },
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }

    const username = req.query.username || req.body?.username
    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Username is required" })
      return
    }
    try {
      const response = await axios.get(`https://www.instagram.com/${username}/`, {
        validateStatus: () => true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36"
        }
      })

      const html = response.data as string;

      // Improved check: look for "Sorry, this page isn't available" in the HTML
      if (
        response.status === 200 &&
        typeof html === "string" &&
        !html.includes("Sorry, this page isn't available")
      ) {
        res.json({ exists: true })
      } else {
        res.json({ exists: false })
      }
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" })
    }
  }
)


/* ----------------------------------------------------------------------------
 * Matching & Admin Callables
 * ------------------------------------------------------------------------- */
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

  // Rounds are free; Premium only affects priority, so there is no quota to check.
  const boyUid = auth.uid
  const likeId = `${roundId}_${girlUid}_${boyUid}`
  const likeSnap = await db.collection('likes').doc(likeId).get()
  if (!likeSnap.exists) throw new HttpsError('failed-precondition', 'Like not found')

  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = db.collection('matches').doc(matchId)
  await db.runTransaction(async (tx) => {
    const mSnap = await tx.get(matchRef)
    if (mSnap.exists) return
    tx.set(matchRef, {
      roundId,
      participants: [boyUid, girlUid],
      boyUid,
      girlUid,
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })

  return { ok: true }
})

export const confirmMatchByGirl = onCall({ region: REGION }, async (req) => {
  const auth = req.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { roundId, boyUid } = (req.data || {}) as { roundId?: string; boyUid?: string }
  const girlUid = auth.uid
  if (!roundId || !boyUid) {
    throw new HttpsError('invalid-argument', 'roundId and boyUid are required')
  }

  // Check that the boy actually liked the girl in this round
  const likeId = `${roundId}_${boyUid}_${girlUid}`
  const likeRef = admin.firestore().collection('likes').doc(likeId)
  const likeSnap = await likeRef.get()
  if (!likeSnap.exists) throw new HttpsError('failed-precondition', 'Like not found')

  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = admin.firestore().collection('matches').doc(matchId)

  // Rounds are free; Premium only affects priority, so there is no quota to check.
  await admin.firestore().runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef)
    if (matchSnap.exists) return
    tx.set(matchRef, {
      roundId,
      participants: [boyUid, girlUid],
      boyUid,
      girlUid,
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })

  // Referral: the girl's referral record qualifies once she confirms a match.
  try {
    const refs = await db.collection('referrals').where('refereeUid', '==', girlUid).get()
    await Promise.all(refs.docs.map((d) => d.ref.update({ hasMatched: true, status: 'qualified' })))
  } catch (e: any) {
    logger.error('[confirmMatchByGirl] referral update failed', { girlUid, error: e?.message })
  }

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

  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = db.collection('matches').doc(matchId)

  await db.runTransaction(async (tx) => {
    const mSnap = await tx.get(matchRef)
    if (mSnap.exists) return
    tx.set(matchRef, {
      roundId,
      participants: [boyUid, girlUid],
      boyUid,
      girlUid,
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })

  return { ok: true }
})

/**
 * (Optional Legacy) Admin manual payment approval.
 */
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

/* ----------------------------------------------------------------------------
 * Legacy Trigger (only fires on update -> approved)
 * ------------------------------------------------------------------------- */
export const onPaymentApproved = onDocumentUpdated(
  { document: 'payments/{paymentId}', region: REGION },
  async (event) => {
    const change: Change<DocumentSnapshot> | undefined = event.data
    if (!change) return
    const before = change.before.data() as any | undefined
    const after = change.after.data() as any | undefined
    if (!after) return
    if (after.subscriptionProvisioned === true) return
    if (before?.status === 'approved') return
    if (after.status !== 'approved') return

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
      logger.log('[onPaymentApproved] subscription provisioned (trigger)', {
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

export * from './notifications'
export * from './randomCall'
export * from './admin'

/* ----------------------------------------------------------------------------
 * expirePremium (daily): mark ended Premium plans expired. Older plans that were
 * sold by match count (no end date) get 30 days from now so nobody loses access
 * without notice.
 * ------------------------------------------------------------------------- */
export const expirePremium = onSchedule({ schedule: '15 0 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const snap = await db.collection('subscriptions').where('status', '==', 'active').get()
  const now = Date.now()
  let expired = 0
  let migrated = 0
  let batch = db.batch()
  let ops = 0
  for (const d of snap.docs) {
    const exp = d.data().expiresAt?.toMillis?.() ?? 0
    const uid = String(d.data().uid || '')
    if (!exp) {
      const expiresAt = admin.firestore.Timestamp.fromMillis(now + DEFAULT_PREMIUM_DAYS * 86_400_000)
      batch.update(d.ref, { expiresAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      if (uid) { batch.set(db.collection('users').doc(uid), { premiumUntil: expiresAt }, { merge: true }); ops++ }
      migrated++
    } else if (exp > now) {
      // Keep the public profile marker in sync (e.g. plans granted before it existed)
      if (uid) batch.set(db.collection('users').doc(uid), { premiumUntil: d.data().expiresAt }, { merge: true })
      else continue
    } else if (exp <= now) {
      batch.update(d.ref, { status: 'expired', updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      expired++
    } else {
      continue
    }
    if (++ops >= 450) { await batch.commit(); batch = db.batch(); ops = 0 }
  }
  if (ops > 0) await batch.commit()
  logger.info('[expirePremium]', { expired, migrated })
})
