import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

if (!admin.apps.length) {
  admin.initializeApp()
}
const db = admin.firestore()

export const joinMatchingRound = onCall(async (request) => {
  const auth = request.auth
  const data = request.data as { roundId?: string }

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in required')
  }
  const uid = auth.uid
  const roundId = data?.roundId
  if (!roundId) {
    throw new HttpsError('invalid-argument', 'roundId is required')
  }

  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'User profile missing')
  }
  const user = userSnap.data() || {}
  const gender = user.gender
  if (gender !== 'male' && gender !== 'female') {
    throw new HttpsError('failed-precondition', 'User gender missing')
  }

  const roundRef = db.collection('matchingRounds').doc(roundId)
  const roundSnap = await roundRef.get()
  if (!roundSnap.exists) {
    throw new HttpsError('not-found', 'Round not found')
  }
  const round = roundSnap.data() || {}
  if (round.isActive !== true) {
    throw new HttpsError('failed-precondition', 'Round is not active')
  }

  const field = gender === 'male' ? 'participatingMales' : 'participatingFemales'
  await roundRef.update({
    [field]: admin.firestore.FieldValue.arrayUnion(uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { status: 'ok' }
})

export const confirmMatch = onCall(async (request) => {
  const auth = request.auth
  const data = request.data as { roundId?: string; girlUid?: string }

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in required')
  }
  const boyUid = auth.uid
  const roundId = data?.roundId
  const girlUid = data?.girlUid
  if (!roundId || !girlUid) {
    throw new HttpsError('invalid-argument', 'roundId and girlUid are required')
  }

  // Verify a like exists from girl -> boy in this round
  const likeId = `${roundId}_${girlUid}_${boyUid}`
  const likeRef = db.collection('likes').doc(likeId)
  const likeSnap = await likeRef.get()
  if (!likeSnap.exists) {
    throw new HttpsError('failed-precondition', 'Like not found for this pair')
  }

  // Create match (include fields used by UI)
  const matchId = `${roundId}_${boyUid}_${girlUid}`
  const matchRef = db.collection('matches').doc(matchId)
  await matchRef.set(
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

  return { status: 'ok' }
})