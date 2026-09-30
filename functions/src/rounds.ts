import { isAdminRequest } from './adminAuth'
import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * Dating rounds run on the server. Members never read the round document
 * (it holds everyone's assignments); they call getMyRound for their own part.
 * Admins run matching and the Premium sync from here instead of the browser.
 */

/** Premium men get this many times more suggestions (priority, not a guarantee). */
const PREMIUM_SUGGESTION_MULTIPLIER = 2

type U = { uid: string; [k: string]: any }

const ms = (t: any) => (t?.toMillis ? t.toMillis() : 0)

async function activeRound() {
  const snap = await db.collection('matchingRounds').where('isActive', '==', true).limit(1).get()
  return snap.empty ? null : snap.docs[0]
}

async function premiumUids(): Promise<Set<string>> {
  const now = Date.now()
  const snap = await db.collection('subscriptions').where('status', '==', 'active').get()
  return new Set(snap.docs.filter((d) => ms(d.get('expiresAt')) > now || !d.get('expiresAt')).map((d) => String(d.get('uid'))))
}

/** Mirrors isDatingReady() in src/firebase.ts */
function datingReady(u: any) {
  if (!u || u.isProfileComplete !== true || u.datingEnabled === false) return false
  return u.datingProfileComplete === true || !!(u.ageRangeMin !== undefined && u.communicationImportance && u.conflictApproach
    && u.sundayStyle && u.travelPreference && u.loveLanguage)
}

function ok(u: any) {
  return !!u && !u.banned && !u.underReview && !u.photoHidden
}

async function blockSet(uid: string) {
  const [mine, theirs] = await Promise.all([
    db.collection('userBlocks').doc(uid).get(),
    db.collection('userBlocks').where('uids', 'array-contains', uid).select().get(),
  ])
  return new Set<string>([...(mine.get('uids') || []), ...theirs.docs.map((d) => d.id)])
}

function premiumFirst<T>(items: T[], uidOf: (x: T) => string, premium: Set<string>): T[] {
  return items.map((x, i) => ({ x, i }))
    .sort((a, b) => Number(premium.has(uidOf(b.x))) - Number(premium.has(uidOf(a.x))) || a.i - b.i)
    .map((o) => o.x)
}

function age(dob?: string) {
  if (!dob) return 21
  const b = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

/** Same scoring as before (moved from the admin browser). -10000 = dealbreaker. */
export function matchScore(source: any, cand: any) {
  const ca = age(cand.dob)
  if (ca < (source.ageRangeMin || 18) || ca > (source.ageRangeMax || 35)) return -10000
  if (source.datingPreference === 'college_only' && cand.userType !== 'college') return -10000
  if (cand.datingPreference === 'college_only' && source.userType !== 'college') return -10000
  let s = 0
  if (source.userType === 'college' && cand.userType === 'college') s += 20
  if (source.college && source.college === cand.college) s += 50
  const si: string[] = source.interests || []
  s += si.filter((i) => (cand.interests || []).includes(i)).length * 5
  if (source.loveLanguage && source.loveLanguage === cand.loveLanguage) s += 15
  if (source.sundayStyle && source.sundayStyle === cand.sundayStyle) s += 10
  if (source.travelPreference && source.travelPreference === cand.travelPreference) s += 10
  return s + Math.random() * 5
}

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

async function usersByUid(uids: string[]) {
  const out = new Map<string, U>()
  for (let i = 0; i < uids.length; i += 100) {
    const refs = uids.slice(i, i + 100).map((u) => db.collection('users').doc(u))
    if (!refs.length) continue
    const snaps = await db.getAll(...refs)
    snaps.forEach((s) => { if (s.exists) out.set(s.id, { uid: s.id, ...s.data() }) })
  }
  return out
}

/** Timestamps → { seconds } so the app reads them like Firestore Timestamps. */
function plainPhases(phases: any) {
  if (!phases) return null
  const t = (x: any) => (x?.toMillis ? { seconds: Math.floor(x.toMillis() / 1000) } : null)
  const one = (p: any) => (p ? { startAt: t(p.startAt), endAt: t(p.endAt), isComplete: !!p.isComplete } : null)
  return { boys: one(phases.boys), girls: one(phases.girls) }
}

/** A member's own view of the active round. */
export const getMyRound = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const round = await activeRound()
  if (!round) return { round: null }
  const d = round.data()
  const me = (await db.collection('users').doc(uid).get()).data() || {}
  const inRound = (d.participatingMales || []).includes(uid) || (d.participatingFemales || []).includes(uid)

  let assigned: string[] = []
  if (me.gender === 'male') {
    const raw: string[] = d.assignedGirlsToBoys?.[uid] || []
    if (raw.length) {
      const [people, blocked] = await Promise.all([usersByUid(raw), blockSet(uid)])
      assigned = raw.filter((u) => {
        const p = people.get(u)
        return p && ok(p) && !blocked.has(u) && datingReady(p) && matchScore(me, p) > -500
      })
    }
  }
  return {
    round: { id: round.id, phases: plainPhases(d.phases), phase: d.phase || null },
    inRound,
    assigned,
  }
})

/** Admin: add Premium men to the active round and drop anyone no longer eligible. */
export const syncActiveRound = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  if (!(isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const round = await activeRound()
  if (!round) throw new HttpsError('failed-precondition', 'No active round')
  const premium = await premiumUids()
  const candidates = [...new Set<string>([...(round.get('participatingMales') || []), ...premium])]
  const people = await usersByUid(candidates)
  const males = candidates.filter((u) => { const p = people.get(u); return p && p.gender === 'male' && datingReady(p) && ok(p) })
  await round.ref.set({ participatingMales: premiumFirst(males, (u) => u, premium), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
  return { activeRoundId: round.id, totalMales: males.length, premiumMales: males.filter((u) => premium.has(u)).length }
})

/**
 * Admin: fill in suggestions for everyone who has none yet.
 *  mode 'smart'  → compatibility score (age range, college-only, interests, vibe), no repeats
 *  mode 'random' → random picks
 *  phase 'boys'  → women suggested to each man in the round
 *  phase 'girls' → among the men who liked her, the best ones for each woman
 */
export const runRoundMatching = onCall({ region: REGION, timeoutSeconds: 540, memory: '1GiB' }, async (req) => {
  if (!(isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { roundId, phase = 'boys', mode = 'smart', countPerUser = 3 } = (req.data || {}) as { roundId?: string; phase?: 'boys' | 'girls'; mode?: 'smart' | 'random'; countPerUser?: number }
  if (!roundId) throw new HttpsError('invalid-argument', 'roundId required')
  const n = Math.min(Math.max(Number(countPerUser) || 3, 1), 20)
  const roundRef = db.collection('matchingRounds').doc(roundId)
  const round = await roundRef.get()
  if (!round.exists) throw new HttpsError('not-found', 'Round not found')
  const d = round.data() || {}
  const premium = await premiumUids()

  const womenSnap = await db.collection('users').where('gender', '==', 'female').get()
  const women: U[] = womenSnap.docs.map((s) => ({ uid: s.id, ...s.data() })).filter((w) => datingReady(w) && ok(w))
  let changes = 0

  if (phase === 'boys') {
    const map: Record<string, string[]> = { ...(d.assignedGirlsToBoys || {}) }
    const menIds: string[] = premiumFirst(d.participatingMales || [], (u: string) => u, premium)
    const men = await usersByUid(menIds)
    for (const boyUid of menIds) {
      if (map[boyUid]?.length) continue
      const boy = men.get(boyUid)
      if (!boy || !ok(boy)) continue
      const count = premium.has(boyUid) ? n * PREMIUM_SUGGESTION_MULTIPLIER : n
      const blocked = await blockSet(boyUid)
      let pool = women.filter((w) => !blocked.has(w.uid))
      let picks: string[]
      if (mode === 'random') {
        picks = shuffle(pool.filter((w) => matchScore(boy, w) > -500).map((w) => w.uid)).slice(0, count)
      } else {
        const past = await db.collection('matches').where('participants', 'array-contains', boyUid).get()
        const seen = new Set<string>(past.docs.flatMap((m) => (m.get('participants') || []) as string[]))
        pool = pool.filter((w) => !seen.has(w.uid))
        picks = pool.map((w) => ({ uid: w.uid, s: matchScore(boy, w) })).filter((x) => x.s > -500)
          .sort((a, b) => b.s - a.s).slice(0, count).map((x) => x.uid)
      }
      if (picks.length) { map[boyUid] = picks; changes++ }
    }
    if (changes) await roundRef.update({ assignedGirlsToBoys: map, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  } else {
    const map: Record<string, string[]> = { ...(d.assignedBoysToGirls || {}) }
    const likes = await db.collection('likes').where('roundId', '==', roundId).get()
    const likedBy: Record<string, Set<string>> = {}
    likes.docs.forEach((l) => {
      const girl = l.get('likedUserUid') ?? l.get('to')
      const boy = l.get('likingUserUid') ?? l.get('likerUid') ?? l.get('from')
      if (girl && boy) (likedBy[girl] ||= new Set()).add(boy)
    })
    const allBoys = await usersByUid([...new Set(Object.values(likedBy).flatMap((s) => [...s]))])
    for (const w of women) {
      if (map[w.uid]?.length || !likedBy[w.uid]) continue
      const blocked = await blockSet(w.uid)
      const scored = [...likedBy[w.uid]]
        .map((u) => allBoys.get(u)).filter((b): b is U => !!b && ok(b) && !blocked.has(b.uid))
        .map((b) => ({ uid: b.uid, s: mode === 'random' ? Math.random() : matchScore(w, b) }))
        .filter((x) => x.s > -500)
        .sort((a, b) => Number(premium.has(b.uid)) - Number(premium.has(a.uid)) || b.s - a.s)
      const picks = scored.slice(0, n).map((x) => x.uid)
      if (picks.length) { map[w.uid] = picks; changes++ }
    }
    if (changes) await roundRef.update({ assignedBoysToGirls: map, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  }
  await db.collection('adminLogs').add({
    adminUid: req.auth!.uid, action: 'round_matching', details: { roundId, phase, mode, changes },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { })
  return { changes }
})
