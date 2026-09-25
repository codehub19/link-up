import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatDate } from '../../services/adminTools'

/** Who did what in the admin panel (latest 500 actions). */
export default function AuditLogAdmin() {
  const [logs, setLogs] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [action, setAction] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(500)))
      .then(async (s) => {
        const list = s.docs.map((d) => ({ id: d.id, ...d.data() }))
        setLogs(list)
        const uids = [...new Set(list.flatMap((l: any) => [l.adminUid, l.targetUid]).filter(Boolean))] as string[]
        const pairs = await Promise.all(uids.map(async (u) => [u, (await getDoc(doc(db, 'users', u)).catch(() => null))?.data()?.name || u.slice(0, 8)] as const))
        setNames(Object.fromEntries(pairs))
      })
      .finally(() => setLoading(false))
  }, [])

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs])
  const shown = logs.filter((l) => action === 'all' || l.action === action)

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Audit log</h2>
          <div className="admin-page-sub">Every admin action — bans, deletions, grants, settings changes</div>
        </div>
      </div>
      <div className="admin-toolbar">
        <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>User</th><th>Details</th></tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.createdAt, true)}</td>
                  <td>{names[l.adminUid] || l.adminUid?.slice(0, 8)}</td>
                  <td>{String(l.action).replace(/_/g, ' ')}</td>
                  <td>{l.targetUid ? <Link to={`/admin/users/${l.targetUid}`}>{names[l.targetUid] || l.targetUid.slice(0, 8)}</Link> : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--admin-text-muted)', maxWidth: 360, wordBreak: 'break-word' }}>
                    {l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '—'}
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} style={{ color: 'var(--admin-text-muted)' }}>{loading ? 'Loading…' : 'No admin actions recorded yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
