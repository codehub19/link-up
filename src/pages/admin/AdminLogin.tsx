import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import {
  adminGoogleStep, adminHasPassword, adminPasswordStep, adminSignOut, claimOwnerAccess, getAdminState, pendingTicket,
  setAdminPassword, setupGoogleSignIn,
} from '../../services/adminAuth'

type Step = 'password' | 'google' | 'setup'

const msg = (e: any) => (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request')
  ? null
  : e?.code === 'auth/user-mismatch' ? 'Choose the Google account with the same email as step 1.'
  : (e?.message || 'Something went wrong').replace(/^Firebase: |\(functions\/[a-z-]+\)\.?/g, '').trim()

/**
 * Admin sign-in, two steps:
 *   1. Email + admin password (kept only on the server; your Gmail can't reset it)
 *   2. Google sign-in with the same email (protected by Google 2-Step Verification)
 */
export default function AdminLogin() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>(() => (pendingTicket() ? 'google' : 'password'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn() } catch (e: any) { setError(msg(e)) } finally { setBusy(false) }
  }

  const card = (children: React.ReactNode) => (
    <div className="container">
      <div className="card" style={{ maxWidth: 440, margin: '40px auto', padding: 24 }}>
        {params.get('reason') === 'idle' && <p style={{ color: '#fbbf24', marginTop: 0 }}>You were signed out after 20 minutes without activity.</p>}
        {params.get('reason') === 'expired' && <p style={{ color: '#fbbf24', marginTop: 0 }}>Your admin session ended. Sign in again.</p>}
        {children}
        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )

  if (step === 'setup') return <Setup onDone={() => { setStep('password'); setError(null) }} />

  if (step === 'password') {
    return card(
      <>
        <div style={{ fontSize: 12, letterSpacing: '.08em', opacity: 0.6 }}>STEP 1 OF 2</div>
        <h2 style={{ margin: '4px 0 16px' }}>Admin sign-in</h2>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await adminPasswordStep(email, password); setPassword(''); setStep('google') }) }}>
          <div><label>Email</label><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label>Admin password</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
        </form>
        <button type="button" className="btn btn-sm" style={{ marginTop: 16, opacity: 0.7 }} onClick={() => { setError(null); setStep('setup') }}>
          First-time setup / set admin password
        </button>
      </>,
    )
  }

  // step === 'google'
  return card(
    <>
      <div style={{ fontSize: 12, letterSpacing: '.08em', opacity: 0.6 }}>STEP 2 OF 2</div>
      <h2 style={{ margin: '4px 0 8px' }}>Confirm with Google</h2>
      <p style={{ marginTop: 0 }}>Sign in with the Google account <strong>{pendingTicket()?.email}</strong>. You have 10 minutes.</p>
      <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await adminGoogleStep(); nav('/admin/home', { replace: true }) })}>
        {busy ? 'Waiting for Google…' : 'Continue with Google'}
      </button>
      <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => { sessionStorage.removeItem('dateu.adminTicket'); setStep('password') }}>Start over</button>
      {user && <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 0 }}>Currently signed in as {user.email}</p>}
    </>,
  )
}

/** Owner activation and setting the admin password (one time). */
function Setup({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const [state, setState] = useState<'loading' | 'signin' | 'claim' | 'password' | 'hasPassword'>('loading')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = async () => {
    if (!user) { setState('signin'); return }
    const s = await getAdminState(user, true)
    if (!s.google) { setState('signin'); return }
    if (!s.admin) { setState('claim'); return }
    setState((await adminHasPassword()) ? 'hasPassword' : 'password')
  }
  useEffect(() => { check().catch((e) => { setError(msg(e)); setState('signin') }) }, [user])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn(); await check() } catch (e: any) { setError(msg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 440, margin: '40px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin setup</h2>
        {state === 'loading' && <p>Checking…</p>}
        {state === 'signin' && (
          <>
            <p>Sign in with your admin Google account (with 2-Step Verification on).</p>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { if (user) await adminSignOut(); await setupGoogleSignIn() })}>Sign in with Google</button>
          </>
        )}
        {state === 'claim' && (
          <>
            <p>Signed in as <strong>{user?.email}</strong>. If this is the owner email (OWNER_EMAILS), activate your access.</p>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await claimOwnerAccess(user!) })}>Activate owner access</button>
          </>
        )}
        {state === 'password' && (
          <form className="stack" onSubmit={(e) => {
            e.preventDefault()
            if (pw !== pw2) { setError('The passwords don’t match.'); return }
            run(async () => { await setAdminPassword(pw); await adminSignOut(); onDone() })
          }}>
            <p style={{ margin: 0 }}>Create your <strong>admin password</strong> for {user?.email}. Use at least 12 characters and don’t reuse your Gmail password. It can’t be reset by email — keep it in a password manager.</p>
            <div><label>Admin password</label><input className="input" type="password" autoComplete="new-password" minLength={12} value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
            <div><label>Repeat it</label><input className="input" type="password" autoComplete="new-password" minLength={12} value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
            <button className="btn btn-primary" type="submit" disabled={busy}>Save and go to sign-in</button>
          </form>
        )}
        {state === 'hasPassword' && (
          <>
            <p>This account already has an admin password. Sign in with it. To change it, open App Controls after signing in.</p>
            <button className="btn btn-primary" onClick={async () => { await adminSignOut(); onDone() }}>Go to sign-in</button>
          </>
        )}
        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
        {state !== 'hasPassword' && <button type="button" className="btn btn-sm" style={{ marginTop: 16, opacity: 0.7 }} onClick={onDone}>Back to sign-in</button>}
      </div>
    </div>
  )
}
