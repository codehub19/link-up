import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { adminGoogleStep, adminPasswordStep, adminSignOut, pendingTicket } from '../../services/adminAuth'

type Step = 'password' | 'google'

const clean = (e: any) => (e?.message || 'Something went wrong').replace(/^Firebase: |\s*\((auth|functions)\/[a-z-]+\)\.?/g, '').trim()

/**
 * Admin sign-in — two steps, then straight into the panel:
 *   1. Email + admin password (checked on the server; can't be reset by email)
 *   2. Google sign-in with the same email (Google 2-Step Verification)
 * Anything that isn't a valid admin ends on the home screen.
 */
export default function AdminLogin() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>(() => (pendingTicket() ? 'google' : 'password'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await adminPasswordStep(email, password)
      setPassword('')
      setStep('google')
    } catch (err: any) {
      setError(clean(err))
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true); setError(null)
    try {
      await adminGoogleStep()
      nav('/admin/home', { replace: true })
    } catch (err: any) {
      const code = String(err?.code || '')
      if (code.includes('popup-closed') || code.includes('cancelled-popup')) { setBusy(false); return }
      if (code.includes('deadline-exceeded')) { setStep('password'); setError('Step 1 expired. Enter your password again.'); setBusy(false); return }
      // Wrong Google account or not an admin: sign out and leave
      await adminSignOut().catch(() => { })
      toast.error('Admin sign-in failed.')
      nav('/', { replace: true })
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 440, margin: '40px auto', padding: 24 }}>
        {params.get('reason') === 'idle' && <p style={{ color: '#fbbf24', marginTop: 0 }}>You were signed out after 20 minutes without activity.</p>}
        {step === 'password' ? (
          <>
            <div style={{ fontSize: 12, letterSpacing: '.08em', opacity: 0.6 }}>STEP 1 OF 2</div>
            <h2 style={{ margin: '4px 0 16px' }}>Admin sign-in</h2>
            <form className="stack" onSubmit={submitPassword}>
              <div><label>Email</label><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><label>Admin password</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, letterSpacing: '.08em', opacity: 0.6 }}>STEP 2 OF 2</div>
            <h2 style={{ margin: '4px 0 8px' }}>Confirm with Google</h2>
            <p style={{ marginTop: 0 }}>Sign in with the Google account <strong>{pendingTicket()?.email}</strong> within 10 minutes.</p>
            <button className="btn btn-primary" disabled={busy} onClick={google}>{busy ? 'Waiting for Google…' : 'Continue with Google'}</button>
            <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => { sessionStorage.removeItem('dateu.adminTicket'); setStep('password') }}>Start over</button>
          </>
        )}
        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )
}
