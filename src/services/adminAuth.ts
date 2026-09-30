import { GoogleAuthProvider, User, reauthenticateWithPopup, signInWithPopup, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'

/** Must match ADMIN_SESSION_HOURS in functions/src/adminAuth.ts and the rules. */
export const ADMIN_SESSION_HOURS = 12
/** The admin panel signs you out after this long without activity. */
export const ADMIN_IDLE_MINUTES = 20

export type AdminState = {
  admin: boolean
  owner: boolean
  google: boolean
  emailVerified: boolean
  /** Signed in less than ADMIN_SESSION_HOURS ago */
  fresh: boolean
  email: string | null
}

export async function getAdminState(user: User, forceRefresh = false): Promise<AdminState> {
  const t = await user.getIdTokenResult(forceRefresh)
  const signedInMs = Date.parse(t.authTime)
  return {
    admin: t.claims.admin === true,
    owner: t.claims.owner === true,
    google: t.signInProvider === 'google.com',
    emailVerified: t.claims.email_verified === true,
    fresh: Date.now() - signedInMs < ADMIN_SESSION_HOURS * 3_600_000,
    email: user.email,
  }
}

const googleProvider = () => {
  const p = new GoogleAuthProvider()
  // Always show the account chooser, so the right Google account is used
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

export async function adminGoogleSignIn() {
  await signInWithPopup(auth, googleProvider())
}

/** Confirm it's you (fresh Google sign-in) — needed every 12 hours for admin actions. */
export async function reconfirmAdmin(user: User) {
  await reauthenticateWithPopup(user, googleProvider())
  await user.getIdToken(true)
}

/** Owner only: turn on admin access for your own account (email must be in OWNER_EMAILS). */
export async function claimOwnerAccess(user: User) {
  await httpsCallable(functions, 'claimAdmin')({})
  await user.getIdToken(true)
}

export async function logAdminSession() {
  await httpsCallable(functions, 'logAdminSession')({}).catch(() => { })
}

export async function adminSignOut() {
  await signOut(auth)
}
