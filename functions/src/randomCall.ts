import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { sendPushToUsers } from './push'
import { getActivePremium } from './premium'
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
  dailyCallLimit: 5, // calls per user per day (free)
  premiumDailyCallLimit: 20, // calls per day with an active plan (a plan's own dailyCallLimit wins)
  matchCallMaxSeconds: 15 * 60, // calls between people who are already matched
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

async function getActiveSubscription(uid: string) {
  return getActivePremium(uid)
}

async function hasActiveSubscription(uid: string) {
  return !!(await getActivePremium(uid))
}

/** Free users get dailyCallLimit; plan holders get the plan's dailyCallLimit or premiumDailyCallLimit. */
async function dailyLimitFor(uid: string, cfg: RandomCallConfig) {
  const sub = await getActiveSubscription(uid)
  if (!sub) return cfg.dailyCallLimit
  if (sub.planId) {
    const plan = (await db.collection('plans').doc(String(sub.planId)).get()).data()
    if (typeof plan?.dailyCallLimit === 'number') return plan.dailyCallLimit
  }
  return cfg.premiumDailyCallLimit
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
  if (me.banned) {
    throw new HttpsError('permission-denied', 'Your account is restricted from calls.', { reason: 'banned' })
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
  const isPremium = !!(await getActiveSubscription(uid))
  const dailyLimit = await dailyLimitFor(uid, cfg)
  // Lets the page show "x of N calls left" for this user's plan
  if (stats.dailyLimit !== dailyLimit) await statsRef.set({ dailyLimit }, { merge: true })
  if (usedToday >= dailyLimit) {
    throw new HttpsError('resource-exhausted', 'You have used all your calls for today.', {
      reason: 'limit',
      dailyCallLimit: dailyLimit,
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
      // Premium members are paired first, then whoever has waited longest
      .sort((a, b) =>
        Number(!!b.data().premium) - Number(!!a.data().premium)
        || (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0))[0]

    const baseEntry = {
      uid,
      gender: me.gender,
      blockedUids: myBlocked,
      lastPeerUid,
      premium: isPremium,
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
      type: 'random',
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
    if (call.connected || call.type === 'match') return

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

/* ----------------------------------------------------------------------------
 * startMatchCall: voice-call someone you're already matched with (or connected
 * with through a random call whose chat is still open). The callee's app rings.
 * ------------------------------------------------------------------------- */
async function canCall(a: string, b: string) {
  const matches = await db.collection('matches').where('participants', 'array-contains', a).get()
  if (matches.docs.some((d) => (d.data().participants || []).includes(b) && (d.data().status ?? 'confirmed') === 'confirmed')) {
    return true
  }
  const thread = (await db.collection('threads').doc(threadIdFor(a, b)).get()).data()
  if (thread?.source === 'random_call') {
    const expires = thread.chatExpiresAt?.toMillis?.() ?? 0
    return thread.unlocked === true || Date.now() < expires
  }
  return false
}

export const startMatchCall = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const { peerUid } = (req.data || {}) as { peerUid?: string }
  if (!peerUid || peerUid === uid) throw new HttpsError('invalid-argument', 'peerUid is required')

  const [meSnap, peerSnap, myBlocks, peerBlocks] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(peerUid).get(),
    db.collection('userBlocks').doc(uid).get(),
    db.collection('userBlocks').doc(peerUid).get(),
  ])
  if (meSnap.data()?.banned) {
    throw new HttpsError('permission-denied', 'Your account is restricted from calls.', { reason: 'banned' })
  }
  if (!peerSnap.exists) throw new HttpsError('not-found', 'User not found')
  if ((myBlocks.data()?.uids || []).includes(peerUid) || (peerBlocks.data()?.uids || []).includes(uid)) {
    throw new HttpsError('permission-denied', "You can't call this person.", { reason: 'blocked' })
  }
  if (!(await canCall(uid, peerUid))) {
    throw new HttpsError('permission-denied', 'You can only call people you are matched with.', { reason: 'not-matched' })
  }

  const cfg = await loadConfig()
  const callRef = db.collection('randomCalls').doc()
  await callRef.set({
    type: 'match',
    participants: [uid, peerUid],
    callerUid: uid,
    calleeUid: peerUid,
    status: 'ringing',
    maxDurationSec: cfg.matchCallMaxSeconds,
    decisions: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  const callerName = String(meSnap.data()?.name || 'Your match').split(' ')[0]
  await sendPushToUsers([peerUid], `📞 ${callerName} is calling you`, 'Open DateU to answer', `/dashboard/random-call?call=${callRef.id}`)
    .catch((e) => logger.warn('match call push failed', e))

  return { callId: callRef.id, maxCallSeconds: cfg.matchCallMaxSeconds }
})

/* ----------------------------------------------------------------------------
 * getTurnCredentials: short-lived TURN relay credentials so calls connect on
 * strict mobile networks. Configure ONE of these in Firestore (server-only):
 *   serverConfig/turn { cloudflareKeyId, cloudflareApiToken }   (Cloudflare Realtime TURN)
 *   serverConfig/turn { urls: [...], username, credential }      (any static TURN server)
 * ------------------------------------------------------------------------- */
export const getTurnCredentials = onCall({ region: REGION }, async (req) => {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const cfg = (await db.collection('serverConfig').doc('turn').get()).data()
  if (!cfg) return { iceServers: [] }

  if (cfg.cloudflareKeyId && cfg.cloudflareApiToken) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${cfg.cloudflareKeyId}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.cloudflareApiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl: 3600 }),
        }
      )
      if (!res.ok) throw new Error(`Cloudflare TURN ${res.status}`)
      const body: any = await res.json()
      const servers = Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers]
      return { iceServers: servers.filter(Boolean) }
    } catch (e: any) {
      logger.error('TURN credentials failed', e?.message)
      return { iceServers: [] }
    }
  }
  if (cfg.urls && cfg.username && cfg.credential) {
    return { iceServers: [{ urls: cfg.urls, username: cfg.username, credential: cfg.credential }] }
  }
  return { iceServers: [] }
})

/* ----------------------------------------------------------------------------
 * randomCallHourReminder: when call hours are configured (openHour/closeHour),
 * push a reminder at opening time to users who turned reminders on.
 * ------------------------------------------------------------------------- */
export const randomCallHourReminder = onSchedule(
  { schedule: '0 * * * *', region: REGION, timeZone: 'UTC' },
  async () => {
    const cfg = await loadConfig()
    if (!cfg.enabled || cfg.openHour == null || cfg.closeHour == null) return
    if (localDate(cfg).getUTCHours() !== cfg.openHour) return

    const snap = await db.collection('users').where('callReminders', '==', true).select().get()
    const uids = snap.docs.map((d) => d.id)
    if (!uids.length) return
    const sent = await sendPushToUsers(uids, '📞 Random calls are open!', 'Call hours just started — meet someone new now.', '/dashboard/random-call')
    logger.info('call hour reminders sent', { users: uids.length, sent })
  }
)
