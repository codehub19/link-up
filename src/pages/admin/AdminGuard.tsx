import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import {
  ADMIN_IDLE_MINUTES, AdminState, adminGoogleSignIn, adminSignOut, claimOwnerAccess, getAdminState, logAdminSession, reconfirmAdmin,
} from '../../services/adminAuth'

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="container">
    <div className="card" style={{ padding: 24, margin: '40px auto', maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  </div>
)

/**
 * The admin area. Access needs ALL of:
 *  - an admin claim set by the server (not a profile field),
 *  - a Google sign-in (protected by your Google account's 2-Step Verification),
 *  - a sign-in less than 12 hours old (otherwise: "Confirm it's you"),
 * and you're signed out after 20 minutes without activity. The database rules and
 * server functions check the same things, so this screen is only the front door.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const [st, setSt] = useState<AdminState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const logged = useRef(false)

  const refresh = useCallback(async (force = false) => {
    if (!user) { setSt(null); return }
    setSt(await getAdminState(user, force))
  }, [user])

  useEffect(() => { refresh(true).catch(() => setSt(null)) }, [refresh])

  const ok = !!st && st.admin && st.google && st.emailVerified && st.fresh

  // Record each admin session in the audit log
  useEffect(() => {
    if (ok && !logged.current) { logged.current = true; logAdminSession() }
  }, [ok])

  // Sign out after inactivity
  useEffect(() => {
    if (!ok) return
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await adminSignOut()
        nav('/admin/login?reason=idle', { replace: true })
      }, ADMIN_IDLE_MINUTES * 60_000)
    }
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)) }
  }, [ok, nav])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null)
    try { await fn(); await refresh(true) } catch (e: any) { setErr(e?.message || 'Something went wrong') } finally { setBusy(false) }
  }

  if (loading || (user && !st)) return null

  if (!user) {
    return (
      <Box title="Admin sign-in">
        <p>Sign in with the Google account that has admin access.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(adminGoogleSignIn)}>Sign in with Google</button>
        {err && <p style={{ color: '#ef4444' }}>{err}</p>}
      </Box>
    )
  }

  if (!st!.admin) {
    return (
      <Box title="Not authorized">
        <p>This account ({st!.email}) doesn’t have admin access.</p>
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          Owner setting up for the first time? Sign in with your Google account (the one in OWNER_EMAILS) and activate access.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {st!.google
            ? <button className="btn btn-primary" disabled={busy} onClick={() => run(() => claimOwnerAccess(user))}>Activate owner access</button>
            : <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await adminSignOut(); await adminGoogleSignIn() })}>Sign in with Google</button>}
          <button className="btn" onClick={() => adminSignOut()}>Sign out</button>
        </div>
        {err && <p style={{ color: '#ef4444' }}>{err}</p>}
      </Box>
    )
  }

  if (!st!.google || !st!.emailVerified) {
    return (
      <Box title="Use Google sign-in">
        <p>Admin access only works when you sign in with Google.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await adminSignOut(); await adminGoogleSignIn() })}>Sign in with Google</button>
        {err && <p style={{ color: '#ef4444' }}>{err}</p>}
      </Box>
    )
  }

  if (!st!.fresh) {
    return (
      <Box title="Confirm it’s you">
        <p>For safety, admins confirm their Google sign-in every 12 hours.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => reconfirmAdmin(user))}>Continue with Google</button>
        {err && <p style={{ color: '#ef4444' }}>{err}</p>}
      </Box>
    )
  }

  return <>{children}</>
}
