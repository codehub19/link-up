import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

const threadIdFor = (a: string, b: string) => [a, b].sort().join('_')

/**
 * Open (create if needed) a chat with someone. Only allowed when you're friends
 * or matched in a dating round, and neither of you has blocked the other.
 * Members can't create chats directly (see firestore.rules), so a link like
 * /dashboard/chat?with=<anyone> can't be used to message strangers.
 */
export const openChat = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const peer = String((req.data as any)?.peerUid || '')
  if (!peer || peer === uid) throw new HttpsError('invalid-argument', 'peerUid is required')

  const id = threadIdFor(uid, peer)
  const ref = db.collection('threads').doc(id)
  const existing = await ref.get()
  if (existing.exists) {
    if (!(existing.get('participants') || []).includes(uid)) throw new HttpsError('permission-denied', 'Not allowed')
    return { threadId: id }
  }

  const [me, them, myBlocks, theirBlocks, ab, ba, matches] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(peer).get(),
    db.collection('userBlocks').doc(uid).get(),
    db.collection('userBlocks').doc(peer).get(),
    db.collection('friendRequests').doc(`${uid}_${peer}`).get(),
    db.collection('friendRequests').doc(`${peer}_${uid}`).get(),
    db.collection('matches').where('participants', 'array-contains', uid).get(),
  ])
  if (!them.exists) throw new HttpsError('not-found', 'User not found')
  if (me.get('banned')) throw new HttpsError('permission-denied', 'Account restricted')
  if ((myBlocks.get('uids') || []).includes(peer) || (theirBlocks.get('uids') || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'You can’t message this person.')
  }
  const friends = ab.get('status') === 'accepted' || ba.get('status') === 'accepted'
  const matched = matches.docs.some((m) => (m.get('participants') || []).includes(peer) && (m.get('status') ?? 'confirmed') === 'confirmed')
  if (!friends && !matched) throw new HttpsError('permission-denied', 'Send a friend request first.')

  const now = admin.firestore.FieldValue.serverTimestamp()
  await ref.create({
    participants: [uid, peer],
    source: friends ? 'friend' : 'match',
    ...(friends ? { friend: true } : {}),
    createdAt: now,
    updatedAt: now,
    lastMessage: null,
  }).catch((e) => { if (e?.code !== 6) throw e }) // 6 = already exists (race)
  return { threadId: id }
})
