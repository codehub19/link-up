import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'
import { endCallAsAdmin, formatDate, timeAgo, toMillis } from '../../services/adminTools'

const QUEUE_STALE_MS = 30_000
const LIVE_MAX_AGE_MS = 30 * 60_000

function duration(c: any) {
  const s = toMillis(c.startedAt)
  if (!s) return '—'
  const e = toMillis(c.endedAt) || (c.status === 'ended' ? 0 : Date.now())
  if (!e) return '—'
  const sec = Math.max(0, Math.round((e - s) / 1000))
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function outcome(c: any) {
  if (c.type === 'match') return c.endReason === 'declined' ? 'Declined' : c.startedAt ? 'Answered' : c.status === 'ended' ? 'Missed' : '—'
  if (c.connected) return '💞 Mutual like'
  const d = Object.values(c.decisions || {})
  if (d.length === 2) return 'No match'
  if (d.length === 1) return `1 decision (${d[0]})`
  if (c.status === 'ended' && !c.startedAt) return "Didn't connect"
  return '—'
}

/** Live view of the random-call queue and recent calls. */
export default function CallsAdmin() {
  const { showConfirm, showAlert } = useDialog()
  const [queue, setQueue] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [now, setNow] = useState(Date.now())
  const [typeFilter, setTypeFilter] = useState<'all' | 'random' | 'match'>('all')

  useEffect(() => {
    const stopQ = onSnapshot(collection(db, 'callQueue'), (s) => setQueue(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const stopC = onSnapshot(query(collection(db, 'randomCalls'), orderBy('createdAt', 'desc'), limit(150)),
      (s) => setCalls(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => { stopQ(); stopC(); clearInterval(t) }
  }, [])

  // Resolve names for everyone on screen
  useEffect(() => {
    const need = new Set<string>()
    calls.forEach((c) => (c.participants || []).forEach((p: string) => !names[p] && need.add(p)))
    queue.forEach((q) => !names[q.id] && need.add(q.id))
    if (!need.size) return
    Promise.all([...need].map(async (u) => [u, (await getDoc(doc(db, 'users', u)).catch(() => null))?.data()?.name || u.slice(0, 8)] as const))
      .then((pairs) => setNames((prev) => ({ ...prev, ...Object.fromEntries(pairs) })))
  }, [calls, queue])

  const waiting = queue.filter((q) => q.status === 'waiting' && now - toMillis(q.heartbeatAt) < QUEUE_STALE_MS)
  const live = calls.filter((c) => c.status !== 'ended' && now - toMillis(c.createdAt) < LIVE_MAX_AGE_MS)
  const today = new Date().toDateString()
  const todays = calls.filter((c) => new Date(toMillis(c.createdAt)).toDateString() === today)

  const shown = useMemo(() => calls.filter((c) => typeFilter === 'all' || (c.type || 'random') === typeFilter), [calls, typeFilter])
  const nm = (u: string) => names[u] || u?.slice(0, 8)

  const end = async (c: any) => {
    if (!(await showConfirm('End this call for both people?'))) return
    try { await endCallAsAdmin(c.id) } catch (e: any) { await showAlert(e?.message || 'Failed') }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Calls</h2>
          <div className="admin-page-sub"><span className="admin-live-dot" />Live — updates automatically</div>
        </div>
        <Link to="/admin/controls" className="btn btn-sm">Call settings</Link>
      </div>

      <div className="admin-grid-4">
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="stat-label">Waiting in queue</div>
          <div className="stat-value">{waiting.length}</div>
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            {waiting.filter((q) => q.gender === 'male').length} men · {waiting.filter((q) => q.gender === 'female').length} women
          </div>
        </div>
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="stat-label">Calls happening now</div>
          <div className="stat-value">{live.length}</div>
        </div>
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="stat-label">Calls today</div>
          <div className="stat-value">{todays.length}</div>
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>{todays.filter((c) => c.connected).length} mutual likes</div>
        </div>
      </div>

      {waiting.length > 0 && (
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 10 }}>In the queue</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {waiting.map((q) => (
              <Link key={q.id} to={`/admin/users/${q.id}`} className="badge badge-neutral">
                {nm(q.id)} · {q.gender} · waiting {timeAgo(q.createdAt).replace(' ago', '')}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
          <option value="all">All calls</option>
          <option value="random">Random calls</option>
          <option value="match">Calls between matches</option>
        </select>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Started</th><th>Type</th><th>People</th><th>Status</th><th>Length</th><th>Outcome</th><th></th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.createdAt, true)}</td>
                  <td>{c.type === 'match' ? 'Match' : 'Random'}</td>
                  <td>
                    {(c.participants || []).map((p: string, i: number) => (
                      <span key={p}>{i > 0 && ' ↔ '}<Link to={`/admin/users/${p}`}>{nm(p)}</Link></span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'ended' ? 'badge-neutral' : 'badge-success'}`}>{c.status}</span>
                    {c.endReason && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>{String(c.endReason).replace(/_/g, ' ')}</div>}
                  </td>
                  <td>{duration(c)}</td>
                  <td>{outcome(c)}</td>
                  <td>{c.status !== 'ended' && <button className="btn btn-sm" onClick={() => end(c)}>End</button>}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} style={{ color: 'var(--admin-text-muted)' }}>No calls yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
