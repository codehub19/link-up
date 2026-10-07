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
  const { email, startDate, endDate, targetSignups, sendOffer } = (req.data || {}) as { email?: string; startDate?: string; endDate?: string; targetSignups?: number; sendOffer?: boolean }
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
  const start = startDate ? new Date(startDate) : new Date()
  const internNo = await internNumber(authUser.uid)
  await db.collection('interns').doc(authUser.uid).set({
    uid: authUser.uid,
    name: user.name || authUser.displayName || e,
    email: e,
    college: user.college || null,
    status: 'active',
    code,
    internNo,
    startAt: admin.firestore.Timestamp.fromDate(isNaN(start.getTime()) ? new Date() : start),
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
  let offerId: string | null = null
  if (sendOffer !== false) offerId = (await issueDocument(authUser.uid, 'offer', req.auth!.uid, {})).id
  return { uid: authUser.uid, code, internNo, offerId }
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

/* ---------------- Documents: offer letter, completion letter, certificate ---------------- */

export type InternDocType = 'offer' | 'completion' | 'certificate'
const DOC_CODE: Record<InternDocType, string> = { offer: 'OL', completion: 'CL', certificate: 'CERT' }
const DOC_LABEL: Record<InternDocType, string> = { offer: 'offer letter', completion: 'completion letter', certificate: 'certificate of completion' }

/** Defaults for the letters; the admin can change them in Admin → Interns → Letter settings. */
export const LETTER_DEFAULTS = {
  companyName: 'DateU',
  website: 'dateu.in',
  email: 'hello@dateu.in',
  address: '',
  signatoryName: '',
  signatoryTitle: 'Founder, DateU',
  role: 'Business Development Intern',
  workMode: 'Remote, with on-campus activities',
  hours: 'Flexible, about 8 to 10 hours a week',
  stipend: 'Performance-based incentives, as per the internship listing',
  acceptDays: 7,
}
type LetterSettings = typeof LETTER_DEFAULTS

async function letterSettings(): Promise<LetterSettings> {
  const s = (await db.collection('internMeta').doc('settings').get()).data() || {}
  const out: any = { ...LETTER_DEFAULTS }
  for (const k of Object.keys(LETTER_DEFAULTS)) {
    const v = s[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 300)
    if (k === 'acceptDays' && Number(v) > 0) out[k] = Math.min(60, Math.round(Number(v)))
  }
  return out
}

/** A running intern number, e.g. DU-INT-2026-007 (kept if the intern already has one). */
async function internNumber(uid: string): Promise<string> {
  const internRef = db.collection('interns').doc(uid)
  const counterRef = db.collection('internMeta').doc('counter')
  return db.runTransaction(async (tx) => {
    const [intern, counter] = await Promise.all([tx.get(internRef), tx.get(counterRef)])
    const existing = intern.get('internNo')
    if (typeof existing === 'string' && existing) return existing
    const next = Number(counter.get('next') || 1)
    tx.set(counterRef, { next: next + 1 }, { merge: true })
    const no = `DU-INT-${new Date().getFullYear()}-${String(next).padStart(3, '0')}`
    if (intern.exists) tx.set(internRef, { internNo: no }, { merge: true })
    return no
  })
}

const ms = (t: any) => (t?.toMillis ? t.toMillis() : null)

async function issueDocument(uid: string, type: InternDocType, adminUid: string, opts: { remarks?: string }) {
  const internRef = db.collection('interns').doc(uid)
  const intern = await internRef.get()
  if (!intern.exists) throw new HttpsError('not-found', 'Not an intern')
  const d = intern.data() || {}
  const internNo = await internNumber(uid)
  const settings = await letterSettings()
  const name = String(d.docName || d.name || '').trim()
  if (!name) throw new HttpsError('failed-precondition', 'The intern has no name on record')
  const startAt = ms(d.startAt) || Date.now()
  // Completion documents end today if the intern finishes early (never before the start)
  const endAt = type === 'offer' ? (ms(d.endAt) || Date.now()) : Math.max(startAt, Math.min(Date.now(), ms(d.endAt) || Date.now()))
  const seq = internNo.split('-').pop()
  const ref = db.collection('internDocuments').doc()
  const stats = type === 'offer' ? null : await statsFor(uid)
  const data: Record<string, any> = {
    uid, type,
    refNo: `DATEU/${DOC_CODE[type]}/${new Date().getFullYear()}/${seq}`,
    internNo, name, college: d.college || null, role: settings.role,
    startAt: admin.firestore.Timestamp.fromMillis(startAt),
    endAt: admin.firestore.Timestamp.fromMillis(endAt),
    settings,
    stats: stats ? { signups: stats.signups, completed: stats.completed, approvedReports: stats.approvedReports, score: stats.score } : null,
    remarks: String(opts.remarks || '').trim().slice(0, 600) || null,
    status: type === 'offer' ? 'issued' : 'valid',
    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
    issuedBy: adminUid,
  }
  if (type === 'offer') data.respondBy = admin.firestore.Timestamp.fromMillis(Date.now() + settings.acceptDays * 86_400_000)

  const batch = db.batch()
  // Older copies of the same document stop being valid
  const old = await db.collection('internDocuments').where('uid', '==', uid).where('type', '==', type).get()
  old.docs.forEach((o) => {
    if (o.get('status') === 'revoked') return
    batch.update(o.ref, { status: 'replaced', replacedBy: ref.id })
    if (type === 'certificate') batch.delete(db.collection('certificates').doc(o.id))
  })
  batch.set(ref, data)
  if (type === 'certificate') {
    // Public certificate page (/certificate/:id): no email or other contact details
    batch.set(db.collection('certificates').doc(ref.id), {
      name, role: 'Business Development', internUid: uid, refNo: data.refNo,
      startDate: new Date(startAt).toISOString(), endDate: new Date(endAt).toISOString(), issueDate: new Date().toISOString(),
      signatoryName: settings.signatoryName || null, signatoryTitle: settings.signatoryTitle,
    })
  }
  batch.set(internRef, { docsIssued: true, documents: { [type]: ref.id } }, { merge: true })
  await batch.commit()

  await db.collection('adminLogs').add({ adminUid, action: `intern_${type}`, targetUid: uid, details: { id: ref.id }, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { })
  const first = name.split(' ')[0]
  await notifyUser(uid, type === 'offer' ? {
    title: '📄 Your DateU offer letter is here',
    body: `Congratulations ${first}! Read your offer letter and accept it in your intern profile.`,
    link: '/intern/profile',
    email: { subject: 'Your DateU internship offer letter', heading: `Congratulations, ${first}!`, text: `Your offer letter for the ${settings.role} role at DateU is ready. Open your intern profile to read it, download it as a PDF and accept the offer within ${settings.acceptDays} days.`, cta: 'View offer letter' },
  } : {
    title: type === 'certificate' ? '🏅 Your certificate of completion is ready' : '📄 Your completion letter is ready',
    body: `Download your ${DOC_LABEL[type]} from your intern profile.`,
    link: '/intern/profile',
    email: { subject: `Your DateU ${DOC_LABEL[type]}`, heading: `Well done, ${first}!`, text: `Your ${DOC_LABEL[type]} for the DateU internship is ready. Open your intern profile to download it and add it to LinkedIn.`, cta: 'Open my documents' },
  })
  return { id: ref.id, refNo: data.refNo as string }
}

/** Admin: issue (or re-issue) an offer letter, completion letter or certificate. */
export const issueInternDocument = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { uid, type, remarks } = (req.data || {}) as { uid?: string; type?: InternDocType; remarks?: string }
  if (!uid || !type || !(type in DOC_CODE)) throw new HttpsError('invalid-argument', 'uid and type required')
  return issueDocument(uid, type, req.auth!.uid, { remarks })
})

/** Admin: withdraw a document (it then shows as not valid on the verify page). */
export const revokeInternDocument = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { id } = (req.data || {}) as { id?: string }
  if (!id) throw new HttpsError('invalid-argument', 'id required')
  const ref = db.collection('internDocuments').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Document not found')
  const batch = db.batch()
  batch.update(ref, { status: 'revoked', revokedAt: admin.firestore.FieldValue.serverTimestamp(), revokedBy: req.auth!.uid })
  if (snap.get('type') === 'certificate') batch.delete(db.collection('certificates').doc(id))
  const intern = await db.collection('interns').doc(snap.get('uid')).get()
  if (intern.get(`documents.${snap.get('type')}`) === id) batch.update(intern.ref, { [`documents.${snap.get('type')}`]: admin.firestore.FieldValue.delete() })
  await batch.commit()
  await db.collection('adminLogs').add({ adminUid: req.auth!.uid, action: 'intern_doc_revoke', targetUid: snap.get('uid'), details: { id }, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { })
  return { ok: true }
})

/** Intern: accept the offer by typing their full name (as printed on the letter). */
export const acceptInternOffer = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const { id, fullName } = (req.data || {}) as { id?: string; fullName?: string }
  if (!id) throw new HttpsError('invalid-argument', 'id required')
  const ref = db.collection('internDocuments').doc(id)
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || snap.get('uid') !== uid || snap.get('type') !== 'offer') throw new HttpsError('not-found', 'Offer not found')
    if (snap.get('status') === 'accepted') return { already: true }
    if (snap.get('status') !== 'issued') throw new HttpsError('failed-precondition', 'This offer is no longer open')
    const norm = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim()
    if (norm(String(fullName || '')) !== norm(String(snap.get('name')))) {
      throw new HttpsError('invalid-argument', `Type your name exactly as on the letter: ${snap.get('name')}`)
    }
    tx.update(ref, { status: 'accepted', acceptedAt: admin.firestore.FieldValue.serverTimestamp(), acceptedName: String(snap.get('name')) })
    tx.set(db.collection('interns').doc(uid), { offerAcceptedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    return { already: false, name: String(snap.get('name')) }
  })
  if (!result.already) {
    const admins = await db.collection('users').where('isAdmin', '==', true).select().get()
    await Promise.all(admins.docs.map((a) => notifyUser(a.id, { title: 'Offer accepted ✅', body: `${(result as any).name} accepted the internship offer.`, link: '/admin/interns', push: true }))).catch(() => { })
  }
  return { ok: true }
})

/** Anyone: check that a DateU internship document is genuine (dateu.in/verify/:id). */
export const verifyInternDocument = onCall({ region: REGION }, async (req) => {
  const { id } = (req.data || {}) as { id?: string }
  if (!id || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid document ID')
  const snap = await db.collection('internDocuments').doc(id).get()
  if (!snap.exists) return { found: false }
  const d = snap.data() || {}
  return {
    found: true,
    type: d.type, refNo: d.refNo, internNo: d.internNo, name: d.name, role: d.role,
    startAt: ms(d.startAt), endAt: ms(d.endAt), issuedAt: ms(d.issuedAt),
    status: d.status, // issued | accepted | valid | replaced | revoked
  }
})
