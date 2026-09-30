import { useState } from 'react'
import { useDialog } from '../../components/ui/Dialog'
import { setAdminPassword } from '../../services/adminAuth'

/** Change your own admin password (needs the current one). */
export default function AdminPasswordCard() {
  const { showAlert } = useDialog()
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="admin-card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Your admin password</div>
      <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
        Step 1 of admin sign-in. It’s separate from your Google password and can’t be reset by email. At least 12 characters.
        (Owner: change yours on your computer with <code>node functions/scripts/hash-admin-password.mjs</code>, then deploy functions.)
      </div>
      <form className="stack" style={{ gap: 10 }} onSubmit={async (e) => {
        e.preventDefault()
        if (pw !== pw2) { await showAlert('The new passwords don’t match.'); return }
        setBusy(true)
        try { await setAdminPassword(pw, cur); setCur(''); setPw(''); setPw2(''); await showAlert('Admin password changed.') }
        catch (err: any) { await showAlert(err?.message || 'Failed') }
        finally { setBusy(false) }
      }}>
        <input className="input" type="password" autoComplete="current-password" placeholder="Current admin password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="New admin password" minLength={12} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="Repeat new password" minLength={12} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        <div><button className="btn btn-primary" type="submit" disabled={busy}>Change password</button></div>
      </form>
    </div>
  )
}
