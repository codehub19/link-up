import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'

/** "Join DateU" call to action used on public pages: signs in, then opens the app or setup. */
export default function JoinButton({ label = 'Join DateU — it’s free', className = 'mk-btn' }: { label?: string; className?: string }) {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        if (user) { nav(profile?.isProfileComplete ? '/dashboard' : '/setup/profile'); return }
        setBusy(true)
        try {
          const isNew = await login()
          nav(isNew ? '/setup/profile' : '/dashboard')
        } catch { } finally { setBusy(false) }
      }}
    >
      {busy ? 'Signing in…' : user ? 'Open DateU' : label}
    </button>
  )
}
