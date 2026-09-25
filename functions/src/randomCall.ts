import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'

/* ----------------------------------------------------------------------------
 * Random voice calls
 *
 * Collections:
 *   callQueue/{uid}          - waiting / matched entry per user (server-written)
 *   randomCalls/{callId}     - one call between two users, also used for WebRTC signaling
 *   randomCallStats/{uid}    - per-day call counter (server-written)
 *   config/randomCall        - optional admin overrides for RANDOM_CALL_DEFAULTS
 *
 * Only users whose Firebase Auth account has a linked (verified) phone number can
 * join the queue. When both people "like" each other after the call, a chat thread
 * is opened for `chatWindowHours`; after that it needs Premium to continue.
 * ------------------------------------------------------------------------- */

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'asia-south2'

// Queue entries whose heartbeat is older than this are treated as abandoned.
const QUEUE_STALE_MS = 30 * 1000

export const RANDOM_CALL_DEFAULTS = {
  enabled: true,
  maxCallSeconds: 5 * 60, // hard cap for a single call
  dailyCallLimit: 5, // calls per user per day
  chatWindowHours: 24, // free chat after a mutual like
  // Optional daily window (local hours, 0-23). null = open all day.
  openHour: null as number | null,
  closeHour: null as number | null,
  utcOffsetMinutes: 330, // IST
}

type RandomCallConfig = typeof RANDOM_CALL_DEFAULTS

async function loadConfig(): Promise<RandomCallConfig> {
  const snap = await db.collection('config').doc('randomCall').get()
  return { ...RANDOM_CALL_DEFAULTS, ...(snap.exists ? (snap.data() as Partial<RandomCallConfig>) : {}) }
}

function localDate(cfg: RandomCallConfig, now = Date.now()) {
  return new Date(now + cfg.utcOffsetMinutes * 60 * 1000)
}

function dayKey(cfg: RandomCallConfig) {
  return localDate(cfg).toISOString().slice(0, 10)
}

function isWithinOpenHours(cfg: RandomCallConfig) {
  if (cfg.openHour == null || cfg.closeHour == null) return true
  const h = localDate(cfg).getUTCHours()
  // Supports windows that cross midnight, e.g. 21 -> 1
  return cfg.openHour <= cfg.closeHour
    ? h >= cfg.openHour && h < cfg.closeHour
    : h >= cfg.openHour || h < cfg.closeHour
}

function threadIdFor(a: string, b: string) {
  return [a, b].sort().join('_')
}

async function hasActiveSubscription(uid: string) {
  const snap = await db.collection('subscriptions').where('uid', '==', uid).limit(10).get()
  return snap.docs.some((d) => d.data()?.status === 'active')
}

/* ----------------------------------------------------------------------------
 * joinRandomCallQueue: pair with a waiting user of the opposite gender, or wait.
 * ------------------------------------------------------------------------- */
export const joinRandomCallQueue = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  // Waiting clients call again periodically so two users who joined at the same
  // moment still find each other.
  const rejoin = !!(req.data as any)?.rejoin

  // Source of truth is the Auth record (users/{uid}.isPhoneVerified is client-writable).
  const authUser = await admin.auth().getUser(uid)
  if (!authUser.phoneNumber) {
    throw new HttpsError('failed-precondition', 'Verify your phone number to use random calls.', { reason: 'phone' })
  }

  const userSnap = await db.collection('users').doc(uid).get()
  const me = userSnap.data() || {}
  if (me.gender !== 'male' && me.gender !== 'female') {
    throw new HttpsError('failed-precondition', 'Complete your profile first.', { reason: 'profile' })
  }
  if (!me.isProfileComplete) {
    throw new HttpsError('failed-precondition', 'Complete your profile first.', { reason: 'profile' })
  }

  const cfg = await loadConfig()
  if (!cfg.enabled) {
    throw new HttpsError('unavailable', 'Random calls are paused right now.', { reason: 'disabled' })
  }
  if (!isWithinOpenHours(cfg)) {
    throw new HttpsError('failed-precondition', 'Random calls are closed right now.', {
      reason: 'closed',
      openHour: cfg.openHour,
      closeHour: cfg.closeHour,
    })
  }

  const today = dayKey(cfg)
  const statsRef = db.collection('randomCallStats').doc(uid)
  const stats = (await statsRef.get()).data() || {}
  const usedToday = stats.day === today ? Number(stats.calls || 0) : 0
  if (usedToday >= cfg.dailyCallLimit) {
    throw new HttpsError('resource-exhausted', 'You have used all your calls for today.', {
      reason: 'limit',
      dailyCallLimit: cfg.dailyCallLimit,
    })
  }

  const blocksSnap = await db.collection('userBlocks').doc(uid).get()
  const myBlocked: string[] = blocksSnap.data()?.uids || []
  const lastPeerUid: string | null = stats.lastPeerUid || null
  const targetGender = me.gender === 'male' ? 'female' : 'male'

  const myQueueRef = db.collection('callQueue').doc(uid)

  return db.runTransaction(async (tx) => {
    const now = admin.firestore.Timestamp.now()
    const mine = (await tx.get(myQueueRef)).data()
    if (rejoin && mine?.status === 'matched' && mine.callId) {
      // Someone paired with us in the meantime; don't overwrite it.
      return { status: 'matched' as const, callId: mine.callId as string, maxCallSeconds: cfg.maxCallSeconds }
    }
    const waiting = await tx.get(
      db.collection('callQueue')
        .where('status', '==', 'waiting')
        .where('gender', '==', targetGender)
        .limit(25)
    )

    const candidate = waiting.docs
      .filter((d) => {
        const data = d.data()
        const hb: admin.firestore.Timestamp | undefined = data.heartbeatAt
        if (d.id === uid) return false
        if (!hb || now.toMillis() - hb.toMillis() > QUEUE_STALE_MS) return false
        if (myBlocked.includes(d.id)) return false
        if ((data.blockedUids || []).includes(uid)) return false
        // Don't immediately re-pair the same two people
        if (d.id === lastPeerUid || data.lastPeerUid === uid) return false
        return true
      })
      .sort((a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0))[0]

    const baseEntry = {
      uid,
      gender: me.gender,
      blockedUids: myBlocked,
      lastPeerUid,
      // Keep our place in line when re-running matchmaking
      createdAt: rejoin && mine?.status === 'waiting' && mine.createdAt ? mine.createdAt : now,
      heartbeatAt: now,
    }

    if (!candidate) {
      tx.set(myQueueRef, { ...baseEntry, status: 'waiting', callId: null })
      return { status: 'waiting' as const, maxCallSeconds: cfg.maxCallSeconds }
    }

    const peerUid = candidate.id
    const peerStatsRef = db.collection('randomCallStats').doc(peerUid)
    const peerStats = (await tx.get(peerStatsRef)).data() || {}

    const callRef = db.collection('randomCalls').doc()
    tx.set(callRef, {
      participants: [peerUid, uid],
      // The user who joined last creates the WebRTC offer.
      callerUid: uid,
      calleeUid: peerUid,
      status: 'connecting',
      maxDurationSec: cfg.maxCallSeconds,
      chatWindowHours: cfg.chatWindowHours,
      decisions: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    tx.update(candidate.ref, { status: 'matched', callId: callRef.id })
    tx.set(myQueueRef, { ...baseEntry, status: 'matched', callId: callRef.id })

    tx.set(statsRef, { day: today, calls: usedToday + 1, lastPeerUid: peerUid }, { merge: true })
    const peerUsed = peerStats.day === today ? Number(peerStats.calls || 0) : 0
    tx.set(peerStatsRef, { day: today, calls: peerUsed + 1, lastPeerUid: uid }, { merge: true })

    return { status: 'matched' as const, callId: callRef.id, maxCallSeconds: cfg.maxCallSeconds }
  })
})

/* ----------------------------------------------------------------------------
 * When both participants like each other, open a time-limited chat thread.
 * ------------------------------------------------------------------------- */
export const onRandomCallUpdated = onDocumentUpdated(
  { document: 'randomCalls/{callId}', region: REGION },
  async (event) => {
    const after = event.data?.after
    if (!after?.exists) return
    const call = after.data() as any
    if (call.connected) return

    const [a, b] = (call.participants || []) as string[]
    if (!a || !b) return
    const decisions = call.decisions || {}
    if (decisions[a] !== 'like' || decisions[b] !== 'like') return

    // Pairs already matched through rounds keep their normal, unlimited chat.
    const matchesSnap = await db.collection('matches').where('participants', 'array-contains', a).get()
    const alreadyMatched = matchesSnap.docs.some((d) => (d.data().participants || []).includes(b))

    const threadId = threadIdFor(a, b)
    const threadRef = db.collection('threads').doc(threadId)
    const hours = Number(call.chatWindowHours || RANDOM_CALL_DEFAULTS.chatWindowHours)

    const opened = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(after.ref)
      if (fresh.data()?.connected) return false
      const threadSnap = await tx.get(threadRef)
      const now = admin.firestore.Timestamp.now()

      const threadPatch: Record<string, any> = {
        participants: [a, b],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      if (!threadSnap.exists) {
        threadPatch.createdAt = admin.firestore.FieldValue.serverTimestamp()
        threadPatch.lastMessage = null
      }
      if (!alreadyMatched && !threadSnap.data()?.unlocked) {
        threadPatch.source = 'random_call'
        threadPatch.randomCallId = after.id
        threadPatch.connectedAt = now
        threadPatch.chatExpiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + hours * 3600 * 1000)
        threadPatch.unlocked = false
      }
      tx.set(threadRef, threadPatch, { merge: true })
      tx.update(after.ref, { connected: true, threadId, connectedAt: now })
      return true
    })

    if (!opened) return

    const batch = db.batch()
    for (const [me, peer] of [[a, b], [b, a]]) {
      batch.set(db.collection('notifications').doc(), {
        title: "It's a connection! 💞",
        body: alreadyMatched
          ? 'You both liked each other on your call. Say hi in chat!'
          : `You both liked each other on your call. You have ${hours} hours of free chat — say hi!`,
        userUid: me,
        peerUid: peer,
        link: `/dashboard/chat?with=${peer}`,
        targetType: 'personal',
        seen: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
    await batch.commit().catch((e) => logger.error('random call notification failed', e))
  }
)

/* ----------------------------------------------------------------------------
 * unlockRandomChat: a Premium user keeps a random-call chat open past its window.
 * ------------------------------------------------------------------------- */
export const unlockRandomChat = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const { threadId } = (req.data || {}) as { threadId?: string }
  if (!threadId) throw new HttpsError('invalid-argument', 'threadId is required')

  const threadRef = db.collection('threads').doc(threadId)
  const thread = (await threadRef.get()).data()
  if (!thread || !(thread.participants || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a participant of this chat')
  }
  if (thread.source !== 'random_call' || thread.unlocked) return { ok: true }

  if (!(await hasActiveSubscription(uid))) {
    throw new HttpsError('failed-precondition', 'Premium is required to keep chatting.', { reason: 'premium' })
  }

  await threadRef.update({
    unlocked: true,
    unlockedBy: uid,
    unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  return { ok: true }
})
