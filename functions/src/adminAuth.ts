import * as admin from 'firebase-admin'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'
import { sendPushToUsers } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * Admin access.
 *
 * Who is an admin is stored as a Firebase Auth custom claim ({ admin: true }),
 * which only this server can set — not a field anyone could edit. On top of that
 * every admin request must:
 *   - come from a Google sign-in (so the Google account's 2-Step Verification protects it),
 *   - have a verified email,
 *   - be from a sign-in less than ADMIN_SESSION_HOURS old (then sign in again).
 *   - have passed BOTH login steps: (1) email + a separate admin password kept only
 *     here (hashed; your Gmail can't reset it) and then (2) Google sign-in. Step 2
 *     writes adminSessions/{uid} bound to that exact Google sign-in (auth_time).
 * The same checks are in firestore.rules and storage.rules.
 *
 * The owner(s) are listed in the OWNER_EMAILS parameter (comma separated). The first
 * `firebase deploy` asks for it and saves it in functions/.env.<project>. Owners
 * activate their own access with claimAdmin and are the only ones who can make or
 * remove other admins.
 */

export const ADMIN_SESSION_HOURS = 12
const OWNER_EMAILS = defineString('OWNER_EMAILS', { description: 'Comma-separated Google emails of the DateU owner(s), e.g. you@gmail.com' })

const owners = () => OWNER_EMAILS.value().split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

function strongSession(token: any) {
  if (!token) return false
  const fresh = Date.now() / 1000 - Number(token.auth_time || 0) < ADMIN_SESSION_HOURS * 3600
  return token.email_verified === true && token.firebase?.sign_in_provider === 'google.com' && fresh
}

const SESSION_MS = ADMIN_SESSION_HOURS * 3_600_000
const TICKET_MS = 10 * 60_000
const MAX_FAILS = 5
const LOCK_MS = 15 * 60_000
const MIN_PASSWORD = 12

const sessionRef = (uid: string) => db.collection('adminSessions').doc(uid)
const credRef = (email: string) => db.collection('adminCredentials').doc(email.toLowerCase())
const attemptsRef = (email: string) => db.collection('adminLoginAttempts').doc(email.toLowerCase())

/** Both login steps done for THIS Google sign-in, and not expired or ended. */
async function hasAdminSession(uid: string, token: any) {
  const s = await sessionRef(uid).get()
  return s.exists && s.get('authTime') === Number(token.auth_time) && Number(s.get('expiresAtMs')) > Date.now()
}

/** True only for an admin who passed both login steps in this (fresh, Google) sign-in. */
export async function isAdminRequest(req: CallableRequest<any>) {
  const t = req.auth?.token as any
  return t?.admin === true && strongSession(t) && await hasAdminSession(req.auth!.uid, t)
}

async function isOwnerRequest(req: CallableRequest<any>) {
  const t = req.auth?.token as any
  return t?.owner === true && owners().includes(String(t.email || '').toLowerCase()) && await isAdminRequest(req)
}

// scrypt password hashing (Node built-in)
function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')
  return { salt, hash }
}
function passwordMatches(password: string, salt: string, hash: string) {
  const got = Buffer.from(hashPassword(password, salt).hash, 'hex')
  const want = Buffer.from(hash, 'hex')
  return got.length === want.length && crypto.timingSafeEqual(got, want)
}

// Short-lived signed "password step passed" ticket. The signing key lives in a
// collection no client can read (adminSecrets), created on first use.
async function ticketKey() {
  const ref = db.collection('adminSecrets').doc('ticketKey')
  const snap = await ref.get()
  if (snap.exists) return String(snap.get('key'))
  const key = crypto.randomBytes(32).toString('hex')
  await ref.create({ key }).catch(() => { })
  return String((await ref.get()).get('key'))
}
async function signTicket(email: string) {
  const body = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + TICKET_MS, n: crypto.randomBytes(8).toString('hex') })).toString('base64url')
  const sig = crypto.createHmac('sha256', await ticketKey()).update(body).digest('base64url')
  return `${body}.${sig}`
}
async function readTicket(ticket: string): Promise<{ email: string; exp: number } | null> {
  const [body, sig] = String(ticket || '').split('.')
  if (!body || !sig) return null
  const want = crypto.createHmac('sha256', await ticketKey()).update(body).digest('base64url')
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null
  const data = JSON.parse(Buffer.from(body, 'base64url').toString())
  return data.exp > Date.now() ? data : null
}

async function audit(adminUid: string, action: string, targetUid: string | null, details: Record<string, any> = {}) {
  await db.collection('adminLogs').add({ adminUid, action, targetUid, details, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { })
}

async function ownerUids() {
  const out: string[] = []
  for (const email of owners()) {
    const u = await admin.auth().getUserByEmail(email).catch(() => null)
    if (u) out.push(u.uid)
  }
  return out
}

/** Owner: turn on your own admin access (only for emails in OWNER_EMAILS). */
export const claimAdmin = onCall({ region: REGION }, async (req) => {
  const t = req.auth?.token as any
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required')
  const email = String(t?.email || '').toLowerCase()
  if (!owners().includes(email) || !strongSession(t)) {
    logger.warn('claimAdmin refused', { uid: req.auth.uid, email })
    throw new HttpsError('permission-denied', 'This account can’t be an admin.')
  }
  await admin.auth().setCustomUserClaims(req.auth.uid, { admin: true, owner: true })
  await db.collection('users').doc(req.auth.uid).set({ isAdmin: true }, { merge: true })
  await audit(req.auth.uid, 'claim_owner', req.auth.uid, { email })
  return { ok: true }
})

/** Owner: make someone an admin, or remove them. They must sign in with Google. */
export const setUserAdmin = onCall({ region: REGION }, async (req) => {
  if (!(await isOwnerRequest(req))) throw new HttpsError('permission-denied', 'Only the owner can change admins. Sign in to the admin panel again.')
  const { uid, isAdmin } = (req.data || {}) as { uid?: string; isAdmin?: boolean }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')
  if (uid === req.auth!.uid) throw new HttpsError('failed-precondition', 'You can’t change your own access here.')
  const target = await admin.auth().getUser(uid).catch(() => null)
  if (!target) throw new HttpsError('not-found', 'User not found')
  if (isAdmin && !target.providerData.some((p) => p.providerId === 'google.com')) {
    throw new HttpsError('failed-precondition', 'Admins must sign in with a Google account.')
  }
  const claims = { ...(target.customClaims || {}) } as Record<string, any>
  if (isAdmin) claims.admin = true
  else { delete claims.admin; delete claims.owner }
  await admin.auth().setCustomUserClaims(uid, claims)
  // Sign them out everywhere so the change applies at once
  if (!isAdmin) {
    await admin.auth().revokeRefreshTokens(uid)
    await sessionRef(uid).delete().catch(() => { })
    if (target.email) await credRef(target.email).delete().catch(() => { })
  }
  await db.collection('users').doc(uid).set({ isAdmin: !!isAdmin }, { merge: true })
  await audit(req.auth!.uid, isAdmin ? 'grant_admin' : 'revoke_admin', uid, { email: target.email || null })
  const notify = (await ownerUids()).filter((u) => u !== req.auth!.uid)
  if (notify.length) await sendPushToUsers(notify, 'Admin access changed', `${target.email || uid} was ${isAdmin ? 'made an admin' : 'removed as admin'}`, '/admin/audit').catch(() => 0)
  return { ok: true }
})

/** Owner: see who has admin access. */
export const listAdmins = onCall({ region: REGION }, async (req) => {
  if (!(await isOwnerRequest(req))) throw new HttpsError('permission-denied', 'Owner only')
  const snap = await db.collection('users').where('isAdmin', '==', true).select('name').get()
  const rows = await Promise.all(snap.docs.map(async (d) => {
    const u = await admin.auth().getUser(d.id).catch(() => null)
    const hasPassword = u?.email ? (await credRef(u.email).get()).exists : false
    return { uid: d.id, name: d.get('name') || null, email: u?.email || null, admin: u?.customClaims?.admin === true, owner: u?.customClaims?.owner === true, hasPassword, lastSignIn: u?.metadata.lastSignInTime || null }
  }))
  return { admins: rows }
})

/** Admin: record that the admin panel was opened (IP isn't stored; time and account are). */
export const logAdminSession = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  await audit(req.auth!.uid, 'admin_session', null, { userAgent: String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 200) })
  return { ok: true }
})

/*
 * Two-step admin login
 *   1. adminPasswordStep({ email, password })  → { ticket }   (not signed in yet)
 *   2. sign in with Google as that same email, then
 *      completeAdminSession({ ticket })        → session for this sign-in (12 h)
 */
const GENERIC = 'Email or admin password is wrong.'

export const adminPasswordStep = onCall({ region: REGION }, async (req) => {
  const email = String((req.data as any)?.email || '').trim().toLowerCase()
  const password = String((req.data as any)?.password || '')
  if (!email || !password || password.length > 200) throw new HttpsError('invalid-argument', GENERIC)

  const aRef = attemptsRef(email)
  const a = (await aRef.get()).data() || {}
  if (Number(a.lockedUntilMs || 0) > Date.now()) {
    throw new HttpsError('resource-exhausted', 'Too many wrong attempts. Try again in 15 minutes.')
  }
  const cred = (await credRef(email).get()).data()
  const ok = !!cred && passwordMatches(password, cred.salt, cred.hash)
  if (!ok) {
    const fails = Number(a.fails || 0) + 1
    await aRef.set({ fails: fails >= MAX_FAILS ? 0 : fails, lockedUntilMs: fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0, lastFailAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    await db.collection('adminLogs').add({ adminUid: 'system', action: 'admin_password_failed', targetUid: null, details: { email, locked: fails >= MAX_FAILS }, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { })
    if (fails >= MAX_FAILS) {
      const notify = await ownerUids()
      if (notify.length) await sendPushToUsers(notify, '⚠️ Admin login locked', `${MAX_FAILS} wrong admin passwords for ${email}`, '/admin/audit').catch(() => 0)
    }
    await new Promise((r) => setTimeout(r, 600)) // slow down guessing
    throw new HttpsError('permission-denied', GENERIC)
  }
  await aRef.set({ fails: 0, lockedUntilMs: 0 }, { merge: true })
  return { ticket: await signTicket(email) }
})

export const completeAdminSession = onCall({ region: REGION }, async (req) => {
  const t = req.auth?.token as any
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in with Google')
  const ticket = await readTicket(String((req.data as any)?.ticket || ''))
  const email = String(t?.email || '').toLowerCase()
  if (!ticket) throw new HttpsError('deadline-exceeded', 'The password step expired. Start again.')
  if (ticket.email !== email) throw new HttpsError('permission-denied', 'Use the Google account with the same email as step 1.')
  if (t?.admin !== true || !strongSession(t)) throw new HttpsError('permission-denied', 'This Google account doesn’t have admin access.')
  // The Google sign-in must be the one that just happened (after the password step)
  if (Date.now() / 1000 - Number(t.auth_time) > TICKET_MS / 1000) throw new HttpsError('permission-denied', 'Sign in with Google again.')
  await sessionRef(req.auth.uid).set({
    authTime: Number(t.auth_time),
    expiresAtMs: Date.now() + SESSION_MS,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + SESSION_MS),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userAgent: String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 200),
  })
  await audit(req.auth.uid, 'admin_login', null, { email })
  return { ok: true, expiresAtMs: Date.now() + SESSION_MS }
})

/** End the admin session (sign-out, idle timeout). */
export const endAdminSession = onCall({ region: REGION }, async (req) => {
  if (req.auth) await sessionRef(req.auth.uid).delete().catch(() => { })
  return { ok: true }
})

/**
 * Set your admin password (min 12 characters). First time: needs a fresh Google
 * sign-in on an admin account. After that: needs a full admin session AND the
 * current password.
 */
export const setAdminPassword = onCall({ region: REGION }, async (req) => {
  const t = req.auth?.token as any
  if (!req.auth || t?.admin !== true || !strongSession(t)) throw new HttpsError('permission-denied', 'Admins only (sign in with Google)')
  const email = String(t.email || '').toLowerCase()
  const { newPassword, currentPassword } = (req.data || {}) as { newPassword?: string; currentPassword?: string }
  if (!newPassword || newPassword.length < MIN_PASSWORD || newPassword.length > 200) {
    throw new HttpsError('invalid-argument', `Use at least ${MIN_PASSWORD} characters.`)
  }
  const ref = credRef(email)
  const existing = (await ref.get()).data()
  if (existing) {
    if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Sign in to the admin panel first.')
    if (!currentPassword || !passwordMatches(currentPassword, existing.salt, existing.hash)) throw new HttpsError('permission-denied', 'Current admin password is wrong.')
  }
  await ref.set({ ...hashPassword(newPassword), uid: req.auth.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  await audit(req.auth.uid, existing ? 'admin_password_changed' : 'admin_password_set', req.auth.uid, { email })
  const notify = (await ownerUids()).filter((u) => u !== req.auth!.uid)
  if (notify.length) await sendPushToUsers(notify, 'Admin password changed', `${email} ${existing ? 'changed' : 'set'} their admin password`, '/admin/audit').catch(() => 0)
  return { ok: true }
})

/** Does this admin account already have an admin password? (for first-time setup) */
export const adminPasswordStatus = onCall({ region: REGION }, async (req) => {
  const t = req.auth?.token as any
  if (!req.auth || t?.admin !== true) throw new HttpsError('permission-denied', 'Admins only')
  return { hasPassword: (await credRef(String(t.email || '')).get()).exists }
})
