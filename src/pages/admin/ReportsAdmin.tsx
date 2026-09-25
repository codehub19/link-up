import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'

type Report = {
  id: string
  reporterUid: string
  reportedUid: string
  threadId: string
  reason: string
  createdAt?: any
  status?: 'open' | 'resolved'
}

type UserLite = { name?: string; photoUrl?: string; banned?: boolean; banReason?: string }

/** Reports from chats and random calls, with ban / unban. */
export default function ReportsAdmin() {
  const { showConfirm, showAlert } = useDialog()
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(200)))
      const rs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Report[]
      setReports(rs)
      const uids = [...new Set(rs.flatMap((r) => [r.reporterUid, r.reportedUid]).filter(Boolean))]
      const entries = await Promise.all(uids.map(async (u) => {
        const s = await getDoc(doc(db, 'users', u)).catch(() => null)
        return [u, (s?.data() || {}) as UserLite] as const
      }))
      setUsers(Object.fromEntries(entries))
    } catch (e: any) {
      await showAlert(e?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setBan = async (uid: string, banned: boolean, reason?: string) => {
    const name = users[uid]?.name || uid
    if (!(await showConfirm(banned ? `Ban ${name}? They won't be able to use random calls or send messages.` : `Unban ${name}?`))) return
    setBusy(uid)
    try {
      await httpsCallable(functions, 'setUserBan')({ uid, banned, reason })
      setUsers((prev) => ({ ...prev, [uid]: { ...prev[uid], banned } }))
    } catch (e: any) {
      await showAlert(e?.message || 'Failed')
    } finally {
      setBusy(null)
    }
  }

  const resolve = async (r: Report) => {
    await updateDoc(doc(db, 'reports', r.id), { status: 'resolved' })
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'resolved' } : x)))
  }

  const visible = reports.filter((r) => showResolved || r.status !== 'resolved')
  const source = (t: string) => (t?.startsWith('randomCall_') ? '📞 Call' : '💬 Chat')
  const when = (t: any) => (t?.toDate ? t.toDate().toLocaleString() : '')

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Reports</h2>
        <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          <span>Show resolved</span>
        </label>
      </div>

      {loading ? (
        <div className="admin-card">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card">No open reports 🎉</div>
      ) : (
        visible.map((r) => {
          const reported = users[r.reportedUid] || {}
          return (
            <div key={r.id} className="admin-card" style={{ marginBottom: 12, opacity: r.status === 'resolved' ? 0.6 : 1 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {source(r.threadId)} · {reported.name || r.reportedUid}
                    {reported.banned && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Banned</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                    Reported by {users[r.reporterUid]?.name || r.reporterUid} · {when(r.createdAt)}
                  </div>
                  <div style={{ marginTop: 8 }}>“{r.reason}”</div>
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <a className="btn" href={`/profile/${r.reportedUid}`} target="_blank" rel="noreferrer">Profile</a>
                  {reported.banned ? (
                    <button className="btn" disabled={busy === r.reportedUid} onClick={() => setBan(r.reportedUid, false)}>Unban</button>
                  ) : (
                    <button className="btn" style={{ color: "#f87171", borderColor: "#f87171" }} disabled={busy === r.reportedUid} onClick={() => setBan(r.reportedUid, true, r.reason)}>Ban</button>
                  )}
                  {r.status !== 'resolved' && <button className="btn" onClick={() => resolve(r)}>Mark resolved</button>}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
