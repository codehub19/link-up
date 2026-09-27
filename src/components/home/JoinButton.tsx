import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'

/** "Join DateU" call to action used on public pages: signs in, then opens the app or setup. */
/** Where to go once signed in (kept through sign-up; see DashboardChooser). */
export const NEXT_KEY = 'dateu.next'

export default function JoinButton({ label = 'Join DateU — it’s free', className = 'mk-btn', to }: { label?: string; className?: string; to?: string }) {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        if (to) { try { sessionStorage.setItem(NEXT_KEY, to) } catch { } }
        if (user) { nav(profile?.isProfileComplete ? (to || '/dashboard') : '/setup/profile'); return }
        setBusy(true)
        try {
          const isNew = await login()
          nav(isNew ? '/setup/profile' : (to || '/dashboard'), { replace: true })
        } catch { } finally { setBusy(false) }
      }}
    >
      {busy ? 'Signing in…' : user && !to ? 'Open DateU' : label}
    </button>
  )
}
