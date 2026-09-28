import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'

type Status = 'open' | 'actioned' | 'dismissed' | 'resolved'
type Report = {
  id: string
  reporterUid: string
  reportedUid: string
  threadId: string
  reason: string
  createdAt?: any
  status?: Status
}

type UserLite = { name?: string; photoUrl?: string; banned?: boolean; banReason?: string; underReview?: boolean }

const ms = (t: any) => (t?.toMillis ? t.toMillis() : 0)
const DAY = 86_400_000

/**
 * Reports from chats, calls, profiles and events. Target: close every report
 * within 24 hours. Closing tells the reporter the outcome automatically.
 */
export default function ReportsAdmin() {
  const { showConfirm, showAlert } = useDialog()
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [loading, setLoading] = useState(true)
  const [showClosed, setShowClosed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(300)))
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

  const isOpen = (r: Report) => !r.status || r.status === 'open'
  // How many different people reported each account
  const reporterCount = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    reports.forEach((r) => { (m[r.reportedUid] ||= new Set()).add(r.reporterUid) })
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size]))
  }, [reports])

  const setBan = async (uid: string, banned: boolean, reason?: string) => {
    const name = users[uid]?.name || uid
    if (!(await showConfirm(banned ? `Ban ${name}? They won't be able to use calls, send requests or appear to others.` : `Unban ${name}?`))) return
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

  const setReview = async (uid: string, underReview: boolean) => {
    setBusy(uid)
    try {
      await httpsCallable(functions, 'setUserReview')({ uid, underReview })
      setUsers((prev) => ({ ...prev, [uid]: { ...prev[uid], underReview } }))
    } catch (e: any) {
      await showAlert(e?.message || 'Failed')
    } finally {
      setBusy(null)
    }
  }

  /** Close a report. The reporter is told the outcome automatically. */
  const close = async (r: Report, status: 'actioned' | 'dismissed') => {
    await updateDoc(doc(db, 'reports', r.id), { status, closedAt: serverTimestamp() })
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)))
  }

  const open = reports.filter(isOpen)
  const overdue = open.filter((r) => Date.now() - ms(r.createdAt) > DAY).length
  const visible = showClosed ? reports : open
  const source = (t: string) => (t?.startsWith('randomCall_') ? '📞 Call' : t?.startsWith('profile_') ? '👤 Profile' : '💬 Chat')
  const age = (t: any) => {
    const h = Math.floor((Date.now() - ms(t)) / 3_600_000)
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Reports</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)', fontSize: 14 }}>
            Goal: close every report within 24 hours. The reporter is told the outcome automatically.
            Accounts reported by 3+ different people in 30 days are hidden until you review them.
          </p>
        </div>
        <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          <span>Show closed</span>
        </label>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="badge badge-info">{open.length} open</span>
        <span className={`badge ${overdue ? 'badge-danger' : 'badge-success'}`}>{overdue} older than 24h</span>
      </div>

      {loading ? (
        <div className="admin-card">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card">No open reports 🎉</div>
      ) : (
        visible.map((r) => {
          const reported = users[r.reportedUid] || {}
          const late = isOpen(r) && Date.now() - ms(r.createdAt) > DAY
          return (
            <div key={r.id} className="admin-card" style={{ marginBottom: 12, opacity: isOpen(r) ? 1 : 0.6, borderColor: late ? '#f87171' : undefined }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {source(r.threadId)} · {reported.name || r.reportedUid}
                    {reported.banned && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Banned</span>}
                    {reported.underReview && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Hidden</span>}
                    {(reporterCount[r.reportedUid] || 0) > 1 && <span className="badge badge-info" style={{ marginLeft: 8 }}>{reporterCount[r.reportedUid]} reporters</span>}
                  </div>
                  <div style={{ fontSize: 13, color: late ? '#f87171' : 'var(--admin-text-muted)', marginTop: 4 }}>
                    Reported by {users[r.reporterUid]?.name || r.reporterUid} · {age(r.createdAt)}{late ? ' · overdue' : ''}
                    {!isOpen(r) && ` · ${r.status === 'dismissed' ? 'No violation' : 'Action taken'}`}
                  </div>
                  <div style={{ marginTop: 8 }}>“{r.reason}”</div>
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <a className="btn btn-sm" href={`/admin/users/${r.reportedUid}`}>User</a>
                  {reported.underReview ? (
                    <button className="btn btn-sm" disabled={busy === r.reportedUid} onClick={() => setReview(r.reportedUid, false)}>Restore</button>
                  ) : (
                    <button className="btn btn-sm" disabled={busy === r.reportedUid} onClick={() => setReview(r.reportedUid, true)}>Hide</button>
                  )}
                  {reported.banned ? (
                    <button className="btn btn-sm" disabled={busy === r.reportedUid} onClick={() => setBan(r.reportedUid, false)}>Unban</button>
                  ) : (
                    <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} disabled={busy === r.reportedUid} onClick={() => setBan(r.reportedUid, true, r.reason)}>Ban</button>
                  )}
                  {isOpen(r) && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => close(r, 'actioned')}>Action taken</button>
                      <button className="btn btn-sm" onClick={() => close(r, 'dismissed')}>No violation</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
