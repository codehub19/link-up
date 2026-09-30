import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'
import { setUserAdmin } from '../../services/adminTools'

type Row = { uid: string; name: string | null; email: string | null; admin: boolean; owner: boolean; hasPassword?: boolean; lastSignIn: string | null }

/** Owner-only: who has admin access. Add admins from a user's page (Users → user → Make admin). */
export default function AdminsCard() {
  const { showConfirm, showAlert } = useDialog()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [denied, setDenied] = useState(false)

  const load = () => httpsCallable(functions, 'listAdmins')({})
    .then((r: any) => setRows(r.data.admins))
    .catch(() => setDenied(true))
  useEffect(() => { load() }, [])

  if (denied) return null // only the owner sees this card
  return (
    <div className="admin-card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Who has admin access</div>
      <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
        Only you (the owner) can add or remove admins. Admins sign in with their admin password and then Google (2-Step Verification on).
        To add one: Users → open their profile → Make admin; they then open /admin/login → First-time setup to create their admin password.
      </div>
      {!rows ? 'Loading…' : rows.map((r) => (
        <div key={r.uid} className="row" style={{ justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
          <div>
            <strong>{r.name || r.email || r.uid}</strong> {r.owner && <span className="badge badge-info">Owner</span>}
            {r.admin && !r.hasPassword && <span className="badge badge-warning" style={{ marginLeft: 6 }}>No admin password yet</span>}
            {!r.admin && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Flag only — no access</span>}
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{r.email} · last sign-in {r.lastSignIn ? new Date(r.lastSignIn).toLocaleString() : '—'}</div>
          </div>
          {!r.owner && (
            <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} onClick={async () => {
              if (!(await showConfirm(`Remove admin access from ${r.email || r.name}? They'll be signed out everywhere.`))) return
              try { await setUserAdmin(r.uid, false); load() } catch (e: any) { showAlert(e?.message || 'Failed') }
            }}>Remove</button>
          )}
        </div>
      ))}
    </div>
  )
}
