import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * "Who viewed your profile".
 *   profileViews/{viewedUid}_{viewerUid}  { viewedUid, viewerUid, at, count }
 * Written only by the server (one entry per pair, refreshed at most every 6 hours).
 * Everyone sees how many people viewed them this week; Premium members see who.
 * Members who turn off "Show when I view profiles" leave no trace — and, to be fair,
 * can't see who viewed them either.
 */

const WEEK = 7 * 86_400_000
const ms = (t: any) => (t?.toMillis ? t.toMillis() : 0)

async function blockedEitherWay(a: string, b: string) {
  const [x, y] = await Promise.all([db.collection('userBlocks').doc(a).get(), db.collection('userBlocks').doc(b).get()])
  return (x.get('uids') || []).includes(b) || (y.get('uids') || []).includes(a)
}

export const recordProfileView = onCall({ region: REGION }, async (req) => {
  const viewer = req.auth?.uid
  const viewed = String((req.data as any)?.uid || '')
  if (!viewer) throw new HttpsError('unauthenticated', 'Sign in required')
  if (!viewed || viewed === viewer) return { ok: false }
  const me = (await db.collection('users').doc(viewer).get()).data() || {}
  if (me.isAdmin || me.banned || me.underReview || me.showViews === false) return { ok: false }
  if (await blockedEitherWay(viewer, viewed)) return { ok: false }

  const ref = db.collection('profileViews').doc(`${viewed}_${viewer}`)
  const prev = await ref.get()
  if (prev.exists && Date.now() - ms(prev.get('at')) < 6 * 3_600_000) return { ok: true }
  await ref.set({
    viewedUid: viewed, viewerUid: viewer,
    at: admin.firestore.FieldValue.serverTimestamp(),
    count: admin.firestore.FieldValue.increment(1),
  }, { merge: true })
  return { ok: true }
})

export const getProfileViews = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const me = (await db.collection('users').doc(uid).get()).data() || {}
  const premium = ms(me.premiumUntil) > Date.now()
  const since = admin.firestore.Timestamp.fromMillis(Date.now() - WEEK)
  const snap = await db.collection('profileViews').where('viewedUid', '==', uid).where('at', '>=', since).orderBy('at', 'desc').limit(100).get()

  const blocks = new Set<string>([
    ...((await db.collection('userBlocks').doc(uid).get()).get('uids') || []),
    ...(await db.collection('userBlocks').where('uids', 'array-contains', uid).select().get()).docs.map((d) => d.id),
  ])
  const rows = snap.docs.filter((d) => !blocks.has(d.get('viewerUid')))
  const canSee = premium && me.showViews !== false
  let viewers: any[] = []
  if (canSee && rows.length) {
    const users = await db.getAll(...rows.map((r) => db.collection('users').doc(r.get('viewerUid'))))
    viewers = users.map((u, i) => {
      const d = u.data()
      if (!d || d.banned || d.underReview) return null
      return { uid: u.id, name: String(d.name || '').split(' ')[0], photoUrl: d.photoUrl || null, college: d.college || null, at: ms(rows[i].get('at')) }
    }).filter(Boolean)
  }
  return { count: rows.length, premium, canSee, showViews: me.showViews !== false, viewers }
})
