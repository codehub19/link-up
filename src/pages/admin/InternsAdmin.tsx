import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../state/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import {
  InternReport, InternTask, REPORT_TYPES, addIntern, createTask, deleteTask, loadInternOverview, reviewReport, setInternStatus,
  subscribeReportsForReview, subscribeTasks,
} from '../../services/interns'

type Row = Awaited<ReturnType<typeof loadInternOverview>>[number]
type Tab = 'interns' | 'review' | 'tasks'

const fmt = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const ago = (ms?: number | null) => {
  if (!ms) return 'never'
  const h = Math.floor((Date.now() - ms) / 3_600_000)
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}
const tsMs = (t: any) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0)

/** Business-development interns: progress, work review, tasks and certificates. */
export default function InternsAdmin() {
  const { user } = useAuth()
  const { showAlert, showConfirm } = useDialog()
  const [tab, setTab] = useState<Tab>('interns')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [reports, setReports] = useState<InternReport[]>([])
  const [showAllReports, setShowAllReports] = useState(false)
  const [tasks, setTasks] = useState<InternTask[]>([])
  const [busy, setBusy] = useState(false)
  // add intern form
  const [email, setEmail] = useState('')
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10))
  const [target, setTarget] = useState('50')
  // task form
  const [tTitle, setTTitle] = useState('')
  const [tDesc, setTDesc] = useState('')
  const [tPoints, setTPoints] = useState('10')
  const [tDue, setTDue] = useState('')

  const refresh = () => loadInternOverview().then(setRows).catch((e) => { setRows([]); showAlert(e?.message || 'Failed to load interns') })
  useEffect(() => { refresh() }, [])
  useEffect(() => subscribeReportsForReview(showAllReports ? 'all' : 'pending', setReports), [showAllReports])
  useEffect(() => subscribeTasks(setTasks), [])

  const nameOf = useMemo(() => Object.fromEntries((rows || []).map((r) => [r.uid, r.name])), [rows])
  const pending = reports.filter((r) => r.status === 'pending').length

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await addIntern(email, endDate, Number(target))
      await showAlert(`Added. Their invite code is ${r.code}. They’ll find the portal at dateu.in/intern (also in their Profile tab).`)
      setEmail('')
      refresh()
    } catch (err: any) {
      await showAlert(err?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const issueCertificate = async (r: Row) => {
    if (!(await showConfirm(`Issue an internship certificate to ${r.name}?`))) return
    const ref = await addDoc(collection(db, 'certificates'), {
      name: r.name, role: 'Business Development', email: r.email,
      startDate: r.startAt ? new Date(r.startAt).toISOString() : new Date().toISOString(),
      endDate: new Date(Math.min(Date.now(), r.endAt || Date.now())).toISOString(),
      issueDate: new Date().toISOString(), internUid: r.uid,
    })
    const url = `${window.location.origin}/certificate/${ref.id}`
    await navigator.clipboard.writeText(url).catch(() => { })
    await showAlert(`Certificate created and link copied:\n${url}`)
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Interns</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)', fontSize: 14 }}>
            Business development internship. Sign-ups are counted automatically from each intern’s invite code; work points come from the logs you approve.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {(['interns', 'review', 'tasks'] as Tab[]).map((t) => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
              {t === 'interns' ? `Interns${rows ? ` (${rows.filter((r) => r.status === 'active').length})` : ''}` : t === 'review' ? `Review work${pending ? ` (${pending})` : ''}` : `Tasks (${tasks.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'interns' && (
        <>
          <form className="admin-card" onSubmit={add} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Intern’s email (their DateU Google account)
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@gmail.com" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Internship ends
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Target (completed sign-ups)
              <input className="input" type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add intern'}</button>
          </form>

          {rows === null ? <div className="admin-card">Loading…</div> : rows.length === 0 ? (
            <div className="admin-card">No interns yet. Ask selected candidates to sign up on dateu.in with Google, then add their email above.</div>
          ) : (
            <div className="admin-card" style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Intern</th><th>Code</th><th>Sign-ups</th><th>Completed</th><th>Work pts</th><th>Score</th><th>Target</th><th>Logs</th><th>Last active</th><th>Ends</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const t = r.targets?.signups || 50
                    return (
                      <tr key={r.uid} style={{ opacity: r.status === 'active' ? 1 : 0.5 }}>
                        <td>{i + 1}</td>
                        <td><a href={`/admin/users/${r.uid}`}>{r.name}</a><div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{r.email}{r.college ? ` · ${r.college}` : ''}{r.status !== 'active' ? ` · ${r.status}` : ''}</div></td>
                        <td><code>{r.code}</code></td>
                        <td>{r.signups}</td>
                        <td>{r.completed}</td>
                        <td>{r.points}</td>
                        <td><strong>{r.score}</strong></td>
                        <td>{Math.round((r.completed / t) * 100)}% <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>of {t}</span></td>
                        <td>{r.approvedReports}✓ {r.pendingReports ? `· ${r.pendingReports} new` : ''}</td>
                        <td>{ago(r.lastActiveAt)}</td>
                        <td>{fmt(r.endAt)}</td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <button className="btn btn-sm" onClick={() => issueCertificate(r)}>Certificate</button>
                            {r.status === 'active' ? (
                              <>
                                <button className="btn btn-sm" onClick={async () => { if (await showConfirm(`Mark ${r.name}'s internship as completed? They lose portal access.`)) { await setInternStatus(r.uid, 'completed'); refresh() } }}>Complete</button>
                                <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} onClick={async () => { if (await showConfirm(`Remove ${r.name} from the internship?`)) { await setInternStatus(r.uid, 'removed'); refresh() } }}>Remove</button>
                              </>
                            ) : (
                              <button className="btn btn-sm" onClick={async () => { await setInternStatus(r.uid, 'active'); refresh() }}>Reactivate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'review' && (
        <>
          <label className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAllReports} onChange={(e) => setShowAllReports(e.target.checked)} /> Show reviewed too
          </label>
          {reports.length === 0 ? <div className="admin-card">Nothing to review 🎉</div> : reports.map((r) => (
            <ReviewCard key={r.id} r={r} who={nameOf[r.uid] || r.uid} task={tasks.find((t) => t.id === r.taskId)} adminUid={user!.uid} onError={(m) => showAlert(m)} />
          ))}
        </>
      )}

      {tab === 'tasks' && (
        <>
          <form className="admin-card" onSubmit={async (e) => {
            e.preventDefault()
            if (!tTitle.trim()) return
            await createTask({ title: tTitle, description: tDesc, points: Number(tPoints), dueAt: tDue ? new Date(tDue + 'T23:59:00') : null })
            setTTitle(''); setTDesc('')
          }} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, gridColumn: '1 / -1' }}>Task
              <input className="input" value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="e.g. Share DateU in 5 college WhatsApp groups" required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, gridColumn: '1 / -1' }}>Details
              <textarea className="input" rows={2} value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="What exactly, and what proof to attach" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Suggested points
              <input className="input" type="number" min={0} value={tPoints} onChange={(e) => setTPoints(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Due (optional)
              <input className="input" type="date" value={tDue} onChange={(e) => setTDue(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit">Add task for all interns</button>
          </form>
          {tasks.map((t) => (
            <div key={t.id} className="admin-card row" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.title} {!!t.points && <span className="badge badge-info">+{t.points}</span>}</div>
                {t.description && <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>{t.description}</div>}
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                  {tsMs(t.dueAt) ? `Due ${fmt(tsMs(t.dueAt))} · ` : ''}{reports.filter((r) => r.taskId === t.id).length} submissions
                </div>
              </div>
              <button className="btn btn-sm" onClick={async () => { if (await showConfirm('Delete this task?')) deleteTask(t.id) }}>Delete</button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function ReviewCard({ r, who, task, adminUid, onError }: { r: InternReport; who: string; task?: InternTask; adminUid: string; onError: (m: string) => void }) {
  const [points, setPoints] = useState(String(r.points || task?.points || 10))
  const [feedback, setFeedback] = useState(r.feedback || '')
  const [busy, setBusy] = useState(false)
  const decide = async (d: 'approved' | 'changes') => {
    setBusy(true)
    try { await reviewReport(r.id, adminUid, d, Number(points) || 0, feedback) } catch (e: any) { onError(e?.message || 'Failed') } finally { setBusy(false) }
  }
  return (
    <div className="admin-card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{REPORT_TYPES[r.type]?.emoji} {r.title}</div>
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 2 }}>
            {who} · {REPORT_TYPES[r.type]?.label}{task ? ` · task: ${task.title}` : ''}{r.reach ? ` · reach ~${r.reach}` : ''} · {fmt(tsMs(r.createdAt))}
            {r.status !== 'pending' && ` · ${r.status === 'approved' ? `approved +${r.points}` : 'sent back'}`}
          </div>
          {r.description && <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{r.description}</p>}
          <div className="row" style={{ gap: 12 }}>
            {r.link && <a href={r.link} target="_blank" rel="noreferrer">Open link ↗</a>}
            {r.proofUrl && <a href={r.proofUrl} target="_blank" rel="noreferrer">Screenshot ↗</a>}
          </div>
        </div>
        {r.proofUrl && <a href={r.proofUrl} target="_blank" rel="noreferrer"><img src={r.proofUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10 }} /></a>}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ width: 90 }} type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} aria-label="Points" />
        <input className="input" style={{ flex: 1, minWidth: 180 }} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback for the intern (optional)" />
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => decide('approved')}>Approve</button>
        <button className="btn btn-sm" disabled={busy} onClick={() => decide('changes')}>Send back</button>
      </div>
    </div>
  )
}
