import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { adminGoogleSignIn, getAdminState } from '../../services/adminAuth'

/** Admins sign in with Google only (no passwords), so Google's 2-Step Verification protects the panel. */
export default function AdminLogin() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getAdminState(user, true).then((s) => { if (s.admin) nav('/admin/home', { replace: true }) }).catch(() => { })
  }, [user, nav])

  const go = async () => {
    setBusy(true); setError(null)
    try {
      await adminGoogleSignIn()
      nav('/admin/home', { replace: true })
    } catch (e: any) {
      setError(e?.code === 'auth/popup-closed-by-user' ? null : (e?.message || 'Sign-in failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin sign-in</h2>
        {params.get('reason') === 'idle' && <p style={{ color: '#fbbf24' }}>You were signed out after 20 minutes without activity.</p>}
        <p>Use the Google account that has admin access. Make sure it has 2-Step Verification turned on.</p>
        <button className="btn btn-primary" onClick={go} disabled={busy}>{busy ? 'Signing in…' : 'Sign in with Google'}</button>
        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )
}
