import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { isAdminRequest } from './adminAuth'
import { notifyUser } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * Business-development internship.
 *   interns/{uid}        { name, email, college, status, code, startAt, endAt, targets }
 *   internTasks/{id}     tasks the admin assigns (to everyone or some interns)
 *   internReports/{id}   work interns log (post, WhatsApp, event, poster…) with a link/photo;
 *                        the admin approves it (with points) or sends it back
 * Sign-ups are counted from the existing referral records (invite code), so an
 * intern's numbers can't be typed in by hand.
 *
 * Score = 10 × sign-ups who finished their profile + 3 × other sign-ups + approved points
 */

const SCORE = { completed: 10, signup: 3 }

function letters(name: string) {
  return (name || 'INTERN').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'DATEU'
}

async function uniqueCode(name: string) {
  for (let i = 0; i < 8; i++) {
    const code = `${letters(name)}${Math.floor(100 + Math.random() * 900)}`
    const taken = await db.collection('users').where('referralCode', '==', code).limit(1).get()
    if (taken.empty) return code
  }
  throw new HttpsError('internal', 'Could not create an invite code, try again')
}

/** Everything we count for one intern. */
async function statsFor(uid: string) {
  const refs = await db.collection('referrals').where('referrerUid', '==', uid).get()
  const refereeIds = refs.docs.map((d) => d.id)
  let completed = 0
  for (let i = 0; i < refereeIds.length; i += 100) {
    const snaps = await db.getAll(...refereeIds.slice(i, i + 100).map((id) => db.collection('users').doc(id)))
    completed += snaps.filter((s) => s.get('isProfileComplete') === true).length
  }
  const reports = await db.collection('internReports').where('uid', '==', uid).get()
  let points = 0, approved = 0, pending = 0
  reports.docs.forEach((r) => {
    if (r.get('status') === 'approved') { approved++; points += Number(r.get('points') || 0) }
    if (r.get('status') === 'pending') pending++
  })
  const signups = refs.size
  const score = completed * SCORE.completed + (signups - completed) * SCORE.signup + points
  return { signups, completed, points, approvedReports: approved, pendingReports: pending, reports: reports.size, score }
}

async function isActiveIntern(uid: string) {
  const s = await db.collection('interns').doc(uid).get()
  return s.exists && s.get('status') === 'active' ? s : null
}

/** Admin: make a DateU member an intern (they sign up on DateU first, with this email). */
export const addIntern = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { email, endDate, targetSignups } = (req.data || {}) as { email?: string; endDate?: string; targetSignups?: number }
  const e = String(email || '').trim().toLowerCase()
  if (!e) throw new HttpsError('invalid-argument', 'Email required')
  const authUser = await admin.auth().getUserByEmail(e).catch(() => null)
  if (!authUser) throw new HttpsError('not-found', 'No DateU account with this email. Ask them to sign up on dateu.in with Google first.')
  const userRef = db.collection('users').doc(authUser.uid)
  const user = (await userRef.get()).data() || {}
  let code = user.referralCode as string | undefined
  if (!code) {
    code = await uniqueCode(user.name || authUser.displayName || 'intern')
    await userRef.set({ referralCode: code }, { merge: true })
  }
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 60 * 86_400_000)
  await db.collection('interns').doc(authUser.uid).set({
    uid: authUser.uid,
    name: user.name || authUser.displayName || e,
    email: e,
    college: user.college || null,
    status: 'active',
    code,
    startAt: admin.firestore.FieldValue.serverTimestamp(),
    endAt: admin.firestore.Timestamp.fromDate(isNaN(end.getTime()) ? new Date(Date.now() + 60 * 86_400_000) : end),
    targets: { signups: Math.max(1, Number(targetSignups) || 50) },
    addedBy: req.auth!.uid,
  }, { merge: true })
  await db.collection('adminLogs').add({ adminUid: req.auth!.uid, action: 'add_intern', targetUid: authUser.uid, details: { email: e }, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { })
  await notifyUser(authUser.uid, {
    title: 'Welcome to the DateU internship! 🚀',
    body: 'Your intern portal is ready: your invite link, tasks and promotion kit are inside.',
    link: '/intern',
    email: { subject: 'Your DateU intern portal is ready', heading: 'Welcome to the team!', text: 'Open your intern portal to get your personal invite link, today’s tasks and a ready-made promotion kit. Every friend who joins with your link counts towards your score.', cta: 'Open intern portal' },
  })
  return { uid: authUser.uid, code }
})

/** Intern: my numbers, my rank and the leaderboard (names and scores only). */
export const internDashboard = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const me = await isActiveIntern(uid)
  if (!me) throw new HttpsError('permission-denied', 'Not an active intern')
  const all = await db.collection('interns').where('status', '==', 'active').get()
  const board = await Promise.all(all.docs.map(async (d) => ({
    uid: d.id, name: String(d.get('name') || '').split(' ')[0], college: d.get('college') || null, ...(await statsFor(d.id)),
  })))
  board.sort((a, b) => b.score - a.score)
  const rank = board.findIndex((b) => b.uid === uid) + 1
  const mine = board.find((b) => b.uid === uid)!
  return {
    me: { ...me.data(), ...mine, rank, total: board.length, startAt: me.get('startAt')?.toMillis?.() || null, endAt: me.get('endAt')?.toMillis?.() || null },
    leaderboard: board.slice(0, 25).map(({ uid: u, name, college, signups, completed, points, score }) => ({ uid: u, name, college, signups, completed, points, score })),
    scoring: SCORE,
  }
})

/** Admin: every intern with their numbers. */
export const adminInternOverview = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const all = await db.collection('interns').get()
  const rows = await Promise.all(all.docs.map(async (d) => {
    const u = await db.collection('users').doc(d.id).get()
    return {
      ...d.data(), uid: d.id,
      startAt: d.get('startAt')?.toMillis?.() || null, endAt: d.get('endAt')?.toMillis?.() || null,
      lastActiveAt: u.get('lastActiveAt')?.toMillis?.() || null,
      ...(await statsFor(d.id)),
    }
  }))
  rows.sort((a: any, b: any) => b.score - a.score)
  return { interns: rows, scoring: SCORE }
})

/** Tell the intern when their report is approved or sent back. */
export const onInternReportReviewed = onDocumentUpdated({ document: 'internReports/{id}', region: REGION }, async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || before.status === after.status || after.status === 'pending') return
  const ok = after.status === 'approved'
  await notifyUser(String(after.uid), {
    title: ok ? `✅ Approved: ${String(after.title || 'your work').slice(0, 60)}` : `↩️ Needs changes: ${String(after.title || 'your work').slice(0, 60)}`,
    body: ok ? `+${Number(after.points || 0)} points.${after.feedback ? ' ' + String(after.feedback).slice(0, 120) : ''}` : String(after.feedback || 'Open your portal to see the feedback.').slice(0, 160),
    link: '/intern',
  })
})
