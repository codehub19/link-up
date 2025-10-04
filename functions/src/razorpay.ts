import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Razorpay from 'razorpay'
import * as crypto from 'crypto'

const db = admin.firestore()

function getClient() {
  const cfg = functions.config()
  const key_id = cfg.razorpay?.key_id
  const key_secret = cfg.razorpay?.key_secret
  if (!key_id || !key_secret) {
    throw new functions.https.HttpsError('failed-precondition', 'Razorpay keys not configured')
  }
  return new Razorpay({ key_id, key_secret })
}

/**
 * Callable: createRazorpayOrder
 */
export const createRazorpayOrder = functions.https.onCall(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required')
  }

  const { planId, amount } = (request.data || {}) as {
    planId?: string
    amount?: number
  }

  if (!planId || typeof planId !== 'string' || typeof amount !== 'number' || amount <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'planId (string) and amount (positive number) required'
    )
  }

  const order = await getClient().orders.create({
    amount: amount * 100,
    currency: 'INR',
    receipt: `plan_${planId}_${auth.uid}_${Date.now()}`,
  })

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: functions.config().razorpay.key_id,
  }
})

/**
 * Callable: verifyRazorpayPayment
 */
export const verifyRazorpayPayment = functions.https.onCall(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required')
  }

  const {
    orderId,
    paymentId,
    signature,
    planId,
    amount,
  } = (request.data || {}) as {
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
    amount <= 0
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'orderId, paymentId, signature, planId, amount required'
    )
  }

  const secret = functions.config().razorpay?.key_secret
  if (!secret) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing key_secret')
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  if (expected !== signature) {
    throw new functions.https.HttpsError('permission-denied', 'Signature mismatch')
  }

  // Upsert payment document
  const paymentsRef = db.collection('payments')
  const existingSnap = await paymentsRef
    .where('uid', '==', auth.uid)
    .where('razorpayOrderId', '==', orderId)
    .limit(1)
    .get()

  const baseData = {
    uid: auth.uid,
    planId,
    amount,
    gateway: 'razorpay',
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    status: 'approved', // or 'pending' if you want manual review
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  let paymentDocId: string
  if (existingSnap.empty) {
    const docRef = await paymentsRef.add({
      ...baseData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    paymentDocId = docRef.id
  } else {
    await existingSnap.docs[0].ref.update(baseData)
    paymentDocId = existingSnap.docs[0].id
  }

  return { success: true, paymentDocId }
})