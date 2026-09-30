import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { ADMIN_IDLE_MINUTES, adminSignOut, getAdminState, watchAdminSession } from '../../services/adminAuth'

/**
 * The admin area. You get in only after BOTH login steps (admin password, then
 * Google) for this exact sign-in, with a server-set admin claim. Sessions last 12 h
 * and end after 20 min without activity. The database rules and server functions
 * check the same things, so this screen is only the front door.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) { setOk(false); return }
    let stop: (() => void) | undefined
    let alive = true
    getAdminState(user, true).then((s) => {
      if (!alive) return
      if (!s.admin || !s.google || !s.emailVerified || !s.fresh) { setOk(false); return }
      stop = watchAdminSession(user.uid, s.authTime, (valid) => setOk(valid))
    }).catch(() => setOk(false))
    return () => { alive = false; stop?.() }
  }, [user])

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

  if (loading || (user && ok === null)) return null
  if (!ok) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
