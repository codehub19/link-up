import { GoogleAuthProvider, User, reauthenticateWithPopup, signInWithPopup, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../firebase'

/*
 * Two-step admin login (see functions/src/adminAuth.ts):
 *   1. email + admin password  → a 10-minute ticket
 *   2. Google sign-in with the same email → admin session for that sign-in (12 h)
 */

export const ADMIN_SESSION_HOURS = 12
/** The admin panel signs you out after this long without activity. */
export const ADMIN_IDLE_MINUTES = 20
const TICKET_KEY = 'dateu.adminTicket'

export type AdminState = {
  admin: boolean
  owner: boolean
  google: boolean
  emailVerified: boolean
  fresh: boolean
  email: string | null
  /** auth_time of this sign-in (seconds) */
  authTime: number
}

export async function getAdminState(user: User, forceRefresh = false): Promise<AdminState> {
  const t = await user.getIdTokenResult(forceRefresh)
  const authTime = Math.floor(Date.parse(t.authTime) / 1000)
  return {
    admin: t.claims.admin === true,
    owner: t.claims.owner === true,
    google: t.signInProvider === 'google.com',
    emailVerified: t.claims.email_verified === true,
    fresh: Date.now() / 1000 - authTime < ADMIN_SESSION_HOURS * 3600,
    email: user.email,
    authTime,
  }
}

/** Live: is there a valid admin session for this exact sign-in? */
export function watchAdminSession(uid: string, authTime: number, cb: (valid: boolean) => void) {
  return onSnapshot(doc(db, 'adminSessions', uid), (s) => {
    const d = s.data()
    cb(!!d && d.authTime === authTime && Number(d.expiresAtMs) > Date.now())
  }, () => cb(false))
}

const googleProvider = (email?: string) => {
  const p = new GoogleAuthProvider()
  p.setCustomParameters(email ? { prompt: 'select_account', login_hint: email } : { prompt: 'select_account' })
  return p
}

/** Step 1 */
export async function adminPasswordStep(email: string, password: string) {
  const r: any = await httpsCallable(functions, 'adminPasswordStep')({ email, password })
  sessionStorage.setItem(TICKET_KEY, JSON.stringify({ ticket: r.data.ticket, email: email.trim().toLowerCase(), at: Date.now() }))
}

export function pendingTicket(): { ticket: string; email: string } | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TICKET_KEY) || 'null')
    return t && Date.now() - t.at < 9 * 60_000 ? t : null
  } catch { return null }
}

/** Step 2: a fresh Google sign-in (always a new one, even if already signed in) */
export async function adminGoogleStep() {
  const t = pendingTicket()
  if (!t) throw new Error('Enter your email and admin password first.')
  const current = auth.currentUser
  if (current && current.email?.toLowerCase() === t.email) await reauthenticateWithPopup(current, googleProvider(t.email))
  else {
    if (current) await signOut(auth)
    await signInWithPopup(auth, googleProvider(t.email))
  }
  await auth.currentUser!.getIdToken(true)
  await httpsCallable(functions, 'completeAdminSession')({ ticket: t.ticket })
  sessionStorage.removeItem(TICKET_KEY)
  // Pick up the admin access the server just confirmed (same sign-in, new claims)
  await auth.currentUser!.getIdToken(true)
}

export async function setAdminPassword(newPassword: string, currentPassword?: string) {
  await httpsCallable(functions, 'setAdminPassword')({ newPassword, currentPassword })
}

export async function adminSignOut() {
  await httpsCallable(functions, 'endAdminSession')({}).catch(() => { })
  sessionStorage.removeItem(TICKET_KEY)
  await signOut(auth)
}
