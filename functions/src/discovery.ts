import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * Friends → Discover, ranked on the server.
 *
 * Only public fields leave the server, and everyone the caller must not see is
 * removed here: blocks both ways, people they already know, hidden/banned
 * accounts, "only my gender can find me" and "requests from verified students only".
 *
 * Score (higher first):
 *   +4 per event you're both going to   +3 per shared interest (max 4)
 *   +2 same college (in "All colleges") +2 active in the last 3 days
 *   +1 verified student   +1 bio/prompts filled   +1 joined in the last 7 days
 *   +3 Premium "Discover boost"          + a small daily shuffle so the list changes
 */

const PUBLIC_FIELDS = ['name', 'photoUrl', 'avatar', 'college', 'dob', 'gender', 'interests', 'bio', 'prompts', 'collegeId',
  'friendsAudience', 'requestsFrom', 'banned', 'underReview', 'photoHidden', 'userType', 'premiumUntil',
  'lastActiveAt', 'createdAt', 'verified', 'isAdmin', 'friendsVisible'] as const

type Candidate = { uid: string; [k: string]: any }
let pool: { at: number; list: Candidate[] } | null = null

/** Everyone visible in Friends, cached per instance for 3 minutes. */
async function candidates(): Promise<Candidate[]> {
  if (pool && Date.now() - pool.at < 3 * 60_000) return pool.list
  const snap = await db.collection('users').where('friendsVisible', '==', true).select(...PUBLIC_FIELDS).limit(5000).get()
  const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
  pool = { at: Date.now(), list }
  return list
}

const ms = (t: any) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : 0)
const DAY = 86_400_000

// Deterministic per-day jitter so order is stable while paging but changes daily
function jitter(a: string, b: string) {
  const s = `${a}:${b}:${Math.floor(Date.now() / DAY)}`
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

function publicView(p: Candidate) {
  return {
    uid: p.uid, name: p.name || null, photoUrl: p.photoUrl || null, avatar: p.avatar || null, college: p.college || null, dob: p.dob || null,
    gender: p.gender || null, interests: Array.isArray(p.interests) ? p.interests.slice(0, 12) : [],
    bio: typeof p.bio === 'string' ? p.bio.slice(0, 300) : null,
    prompts: Array.isArray(p.prompts) ? p.prompts.slice(0, 3) : [],
    verified: p.collegeId?.verified === true || p.verified === true,
  }
}

export const discoverPeople = onCall({ region: REGION, memory: '512MiB' }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const { scope = 'all', offset = 0, pageSize = 24 } = (req.data || {}) as { scope?: 'all' | 'college'; offset?: number; pageSize?: number }
  const size = Math.min(Math.max(Number(pageSize) || 24, 1), 48)
  const start = Math.max(Number(offset) || 0, 0)

  const [meSnap, myBlocks, blockedMe, sent, received, myEvents] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('userBlocks').doc(uid).get(),
    db.collection('userBlocks').where('uids', 'array-contains', uid).select().get(),
    db.collection('friendRequests').where('from', '==', uid).select('to').get(),
    db.collection('friendRequests').where('to', '==', uid).select('from').get(),
    db.collectionGroup('attendees').where('uid', '==', uid).limit(30).get(),
  ])
  const me = meSnap.data() || {}
  if (me.banned) throw new HttpsError('permission-denied', 'Account suspended')
  const myVerified = me.collegeId?.verified === true || me.verified === true

  const exclude = new Set<string>([uid])
  ;(myBlocks.get('uids') || []).forEach((u: string) => exclude.add(u))
  blockedMe.docs.forEach((d) => exclude.add(d.id))
  sent.docs.forEach((d) => exclude.add(d.get('to')))
  received.docs.forEach((d) => exclude.add(d.get('from')))

  // Who else is going to the events I'm going to (upcoming or last 2 weeks)
  const sharedEvents = new Map<string, string[]>()
  const recentCut = Date.now() - 14 * DAY
  await Promise.all(myEvents.docs.map(async (a) => {
    const eventRef = a.ref.parent.parent
    if (!eventRef) return
    const ev = await eventRef.get()
    if (!ev.exists || ev.get('status') !== 'published' || ms(ev.get('endAt') || ev.get('startAt')) < recentCut) return
    const title = String(ev.get('title') || 'an event')
    const others = await eventRef.collection('attendees').select('uid').limit(300).get()
    others.docs.forEach((o) => {
      if (o.id === uid) return
      const arr = sharedEvents.get(o.id) || []
      arr.push(title)
      sharedEvents.set(o.id, arr)
    })
  }))

  const myInterests = new Set<string>((me.interests || []).map((i: string) => String(i)))
  const now = Date.now()
  const all = await candidates()

  const ranked = all
    .filter((p) =>
      !exclude.has(p.uid) && !p.banned && !p.underReview && !p.photoHidden && p.userType !== 'general'
      && (p.friendsAudience !== 'same' || p.gender === me.gender)
      && (p.requestsFrom !== 'verified' || myVerified)
      && (scope === 'all' || (!!me.college && p.college === me.college)))
    .map((p) => {
      const reasons: string[] = []
      let score = 0
      const events = sharedEvents.get(p.uid) || []
      if (events.length) { score += 4 * events.length; reasons.push(`Also going to ${events[0]}`) }
      const shared = (p.interests || []).filter((i: string) => myInterests.has(i))
      if (shared.length) {
        score += 3 * Math.min(shared.length, 4)
        reasons.push(shared.length === 1 ? `Into ${shared[0]} too` : `${shared.length} shared interests: ${shared.slice(0, 2).join(', ')}`)
      }
      if (me.college && p.college === me.college) { if (scope === 'all') score += 2; reasons.push(`Also at ${p.college}`) }
      if (now - ms(p.lastActiveAt) < 3 * DAY) { score += 2; reasons.push('Active recently') }
      if (p.collegeId?.verified || p.verified) score += 1
      if (p.bio || (Array.isArray(p.prompts) && p.prompts.length)) score += 1
      if (now - ms(p.createdAt) < 7 * DAY) { score += 1; reasons.push('New on DateU') }
      if (ms(p.premiumUntil) > now) score += 3
      score += jitter(uid, p.uid)
      return { p, score, reasons }
    })
    .sort((a, b) => b.score - a.score)

  const page = ranked.slice(start, start + size).map(({ p, reasons }) => ({ ...publicView(p), reasons: reasons.slice(0, 2) }))
  return { people: page, nextOffset: start + size < ranked.length ? start + size : null, total: ranked.length }
})
