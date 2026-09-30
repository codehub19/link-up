import * as admin from 'firebase-admin'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import * as logger from 'firebase-functions/logger'
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

/** True only for an admin with a fresh, Google-signed-in session. */
export function isAdminRequest(req: CallableRequest<any>) {
  const t = req.auth?.token as any
  return t?.admin === true && strongSession(t)
}

function isOwnerRequest(req: CallableRequest<any>) {
  const t = req.auth?.token as any
  return t?.owner === true && strongSession(t) && owners().includes(String(t.email || '').toLowerCase())
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
  if (!isOwnerRequest(req)) throw new HttpsError('permission-denied', 'Only the owner can change admins. Sign in again with your Google account.')
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
  if (!isAdmin) await admin.auth().revokeRefreshTokens(uid)
  await db.collection('users').doc(uid).set({ isAdmin: !!isAdmin }, { merge: true })
  await audit(req.auth!.uid, isAdmin ? 'grant_admin' : 'revoke_admin', uid, { email: target.email || null })
  const notify = (await ownerUids()).filter((u) => u !== req.auth!.uid)
  if (notify.length) await sendPushToUsers(notify, 'Admin access changed', `${target.email || uid} was ${isAdmin ? 'made an admin' : 'removed as admin'}`, '/admin/audit').catch(() => 0)
  return { ok: true }
})

/** Owner: see who has admin access. */
export const listAdmins = onCall({ region: REGION }, async (req) => {
  if (!isOwnerRequest(req)) throw new HttpsError('permission-denied', 'Owner only')
  const snap = await db.collection('users').where('isAdmin', '==', true).select('name').get()
  const rows = await Promise.all(snap.docs.map(async (d) => {
    const u = await admin.auth().getUser(d.id).catch(() => null)
    return { uid: d.id, name: d.get('name') || null, email: u?.email || null, admin: u?.customClaims?.admin === true, owner: u?.customClaims?.owner === true, lastSignIn: u?.metadata.lastSignInTime || null }
  }))
  return { admins: rows }
})

/** Admin: record that the admin panel was opened (IP isn't stored; time and account are). */
export const logAdminSession = onCall({ region: REGION }, async (req) => {
  if (!isAdminRequest(req)) throw new HttpsError('permission-denied', 'Admin only')
  await audit(req.auth!.uid, 'admin_session', null, { userAgent: String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 200) })
  return { ok: true }
})
