import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

if (!admin.apps.length) {
  admin.initializeApp()
}
const db = admin.firestore()

export const joinMatchingRound = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
  }
  const uid = context.auth.uid
  const roundId: string = data?.roundId
  if (!roundId) {
    throw new functions.https.HttpsError('invalid-argument', 'roundId is required')
  }

  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'User profile missing')
  }
  const user = userSnap.data() || {}
  const gender = user.gender
  if (gender !== 'male' && gender !== 'female') {
    throw new functions.https.HttpsError('failed-precondition', 'User gender missing')
  }

  const roundRef = db.collection('matchingRounds').doc(roundId)
  const roundSnap = await roundRef.get()
  if (!roundSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Round not found')
  }
  const round = roundSnap.data() || {}
  if (round.isActive !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Round is not active')
  }

  const field = gender === 'male' ? 'participatingMales' : 'participatingFemales'
  await roundRef.update({
    [field]: admin.firestore.FieldValue.arrayUnion(uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  return { status: 'ok' }
})