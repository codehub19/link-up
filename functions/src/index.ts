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
import axios from 'axios'

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

async function isRequesterAdmin(uid?: string): Promise<boolean> {
  if (!uid) return false
  const snap = await db.collection('users').doc(uid).get()
  return !!snap.exists && snap.data()?.isAdmin === true
}

async function getActiveSubscription(uid: string): Promise<ActiveSubscription | null> {
  const snap = await db
    .collection('subscriptions')
    .where('uid', '==', uid)
    .limit(10)
    .get()
  if (snap.empty) return null
  const subs: ActiveSubscription[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  const withRemaining = subs.find(s => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0)
  return withRemaining || subs.find(s => s.status === 'active') || null
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
  fallbackQuota = 0
) {
  const planSnap = await db.collection('plans').doc(planId).get()
  const plan = planSnap.exists ? (planSnap.data() as any) : undefined
  const quota = Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0)

  if (!quota || quota <= 0) {
    logger.warn('[provision] Missing or invalid quota', {
      planId,
      hasPlanDoc: planSnap.exists,
      computedQuota: quota,
    })
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

  // Get the boy's active subscription (for quota and rounds logic)
  const subsSnap = await admin.firestore()
    .collection('subscriptions')
    .where('uid', '==', boyUid)
    .where('status', '==', 'active')
    .get()

  if (subsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Boy has no active subscription')
  }

  const subDoc = subsSnap.docs[0]
  const subRef = subDoc.ref
  const subData = subDoc.data()
  const remainingMatches = Number(subData.remainingMatches ?? 0)
  const roundsUsed = Number(subData.roundsUsed ?? 0)
  const roundsAllowed = Number(subData.roundsAllowed ?? 1)

  if (remainingMatches <= 0) {
    throw new HttpsError('failed-precondition', 'Boy’s match quota exhausted')
  }
  if (roundsUsed >= roundsAllowed) {
    throw new HttpsError('failed-precondition', 'Boy’s allowed rounds exhausted')
  }

  await admin.firestore().runTransaction(async (tx) => {
    // READS FIRST
    const matchSnap = await tx.get(matchRef)
    const roundRef = admin.firestore().collection('matchingRounds').doc(roundId)
    const roundSnap = await tx.get(roundRef)

    if (matchSnap.exists) return

    // Create the match
    tx.set(matchRef, {
      roundId,
      participants: [boyUid, girlUid],
      boyUid,
      girlUid,
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    // Decrement quota
    const nextMatches = remainingMatches - 1
    const nextRoundsUsed = nextMatches <= 0 ? roundsUsed + 1 : roundsUsed
    tx.update(subRef, {
      remainingMatches: nextMatches,
      roundsUsed: nextRoundsUsed,
      status: (nextMatches <= 0 || nextRoundsUsed >= roundsAllowed) ? 'expired' : 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Remove boy from round and all girls' lists if quota/rounds exhausted
    if (nextMatches <= 0 || nextRoundsUsed >= roundsAllowed) {
      if (roundSnap.exists) {
        const data = roundSnap.data()
        tx.update(roundRef, {
          participatingMales: admin.firestore.FieldValue.arrayRemove(boyUid),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        // assignedBoysToGirls logic
        let assignedBoysToGirls = (data?.assignedBoysToGirls ?? {})
        if (
          assignedBoysToGirls &&
          typeof assignedBoysToGirls === 'object' &&
          !Array.isArray(assignedBoysToGirls)
        ) {
          Object.keys(assignedBoysToGirls).forEach(girlKey => {
            if (Array.isArray(assignedBoysToGirls[girlKey])) {
              assignedBoysToGirls[girlKey] = assignedBoysToGirls[girlKey].filter((uid: string) => uid !== boyUid)
            }
          })
          tx.update(roundRef, { assignedBoysToGirls })
        }
      }
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