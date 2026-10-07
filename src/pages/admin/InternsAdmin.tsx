import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import {
  DOC_INFO, InternDocType, InternDocument, InternReport, InternTask, LetterSettings, REPORT_TYPES, addIntern, createTask, deleteTask,
  issueDocument, loadInternOverview, loadLetterSettings, reviewReport, revokeDocument, saveLetterSettings, setInternStatus,
  subscribeMyDocuments, subscribeReportsForReview, subscribeTasks, tsToMs,
} from '../../services/interns'

type Row = Awaited<ReturnType<typeof loadInternOverview>>[number]
type Tab = 'interns' | 'review' | 'tasks' | 'letters'

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
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10))
  const [target, setTarget] = useState('50')
  const [sendOffer, setSendOffer] = useState(true)
  const [openDocs, setOpenDocs] = useState<string | null>(null)
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
      const r = await addIntern(email, { startDate, endDate, targetSignups: Number(target), sendOffer })
      await showAlert(`Added as ${r.internNo}. Invite code ${r.code}.${r.offerId ? ' Their offer letter has been sent; they accept it on their intern profile.' : ''} They’ll find the portal at dateu.in/intern (also in their Profile tab).`)
      setEmail('')
      refresh()
    } catch (err: any) {
      await showAlert(err?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const complete = async (r: Row) => {
    if (!(await showConfirm(`Mark ${r.name}'s internship as completed? Their portal closes, but they keep their profile and documents.`))) return
    await setInternStatus(r.uid, 'completed')
    if (await showConfirm(`Issue ${r.name}'s completion letter and certificate now?`)) {
      try {
        await issueDocument(r.uid, 'completion')
        await issueDocument(r.uid, 'certificate')
        await showAlert('Done. They’ve been notified and can download both from their intern profile.')
      } catch (e: any) { await showAlert(e?.message || 'Failed') }
    }
    refresh()
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
          {(['interns', 'review', 'tasks', 'letters'] as Tab[]).map((t) => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
              {t === 'interns' ? `Interns${rows ? ` (${rows.filter((r) => r.status === 'active').length})` : ''}` : t === 'review' ? `Review work${pending ? ` (${pending})` : ''}` : t === 'tasks' ? `Tasks (${tasks.length})` : 'Letter settings'}
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
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Internship starts
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Internship ends
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Target (completed sign-ups)
              <input className="input" type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={sendOffer} onChange={(e) => setSendOffer(e.target.checked)} /> Send offer letter now
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add intern'}</button>
          </form>

          {rows === null ? <div className="admin-card">Loading…</div> : rows.length === 0 ? (
            <div className="admin-card">No interns yet. Ask selected candidates to sign up on dateu.in with Google, then add their email above.</div>
          ) : (
            <div className="admin-card" style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Intern</th><th>Offer</th><th>Code</th><th>Sign-ups</th><th>Completed</th><th>Work pts</th><th>Score</th><th>Target</th><th>Logs</th><th>Last active</th><th>Ends</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const t = r.targets?.signups || 50
                    return (
                      <Fragment key={r.uid}>
                      <tr style={{ opacity: r.status === 'active' ? 1 : 0.6 }}>
                        <td>{i + 1}</td>
                        <td><a href={`/admin/users/${r.uid}`}>{r.name}</a><div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{r.email}{r.college ? ` · ${r.college}` : ''}{r.status !== 'active' ? ` · ${r.status}` : ''}</div>{r.internNo && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{r.internNo}</div>}</td>
                        <td>{r.offerAcceptedAt ? <span className="badge badge-success">Accepted</span> : r.documents?.offer ? <span className="badge badge-warning">Sent</span> : '—'}</td>
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
                            <button className={`btn btn-sm ${openDocs === r.uid ? 'btn-primary' : ''}`} onClick={() => setOpenDocs(openDocs === r.uid ? null : r.uid)}>Documents</button>
                            {r.status === 'active' ? (
                              <>
                                <button className="btn btn-sm" onClick={() => complete(r)}>Complete</button>
                                <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} onClick={async () => { if (await showConfirm(`Remove ${r.name} from the internship?`)) { await setInternStatus(r.uid, 'removed'); refresh() } }}>Remove</button>
                              </>
                            ) : (
                              <button className="btn btn-sm" onClick={async () => { await setInternStatus(r.uid, 'active'); refresh() }}>Reactivate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {openDocs === r.uid && (
                        <tr><td colSpan={13} style={{ background: 'rgba(255,255,255,.02)' }}><DocsPanel uid={r.uid} name={r.name} onChange={refresh} /></td></tr>
                      )}
                      </Fragment>
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

      {tab === 'letters' && <LetterSettingsForm />}

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

const DOC_STATUS: Record<InternDocument['status'], string> = { issued: 'Sent, not accepted', accepted: 'Accepted', valid: 'Valid', replaced: 'Replaced', revoked: 'Withdrawn' }

/** One intern's offer letter, completion letter and certificate. */
function DocsPanel({ uid, name, onChange }: { uid: string; name: string; onChange: () => void }) {
  const { showAlert, showConfirm } = useDialog()
  const [docs, setDocs] = useState<InternDocument[]>([])
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => subscribeMyDocuments(uid, setDocs), [uid])

  const issue = async (type: InternDocType) => {
    const has = docs.some((d) => d.type === type && (d.status === 'issued' || d.status === 'accepted' || d.status === 'valid'))
    if (!(await showConfirm(has ? `Issue a new ${DOC_INFO[type].title.toLowerCase()} for ${name}? The current one will be marked as replaced.` : `Issue the ${DOC_INFO[type].title.toLowerCase()} to ${name}? They’ll be notified.`))) return
    setBusy(type)
    try { const r = await issueDocument(uid, type, type === 'completion' ? remarks : undefined); onChange(); await showAlert(`Issued ${r.refNo}.`) }
    catch (e: any) { await showAlert(e?.message || 'Failed') }
    finally { setBusy(null) }
  }
  const revoke = async (d: InternDocument) => {
    if (!(await showConfirm(`Withdraw ${d.refNo}? It will show as not valid on the verification page.`))) return
    try { await revokeDocument(d.id); onChange() } catch (e: any) { await showAlert(e?.message || 'Failed') }
  }
  const view = (d: InternDocument) => (d.type === 'certificate' ? `/certificate/${d.id}` : `/intern/documents/${d.id}`)

  return (
    <div style={{ display: 'grid', gap: 12, padding: '6px 0' }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => issue('offer')}>{busy === 'offer' ? 'Issuing…' : 'Issue offer letter'}</button>
        <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => issue('completion')}>{busy === 'completion' ? 'Issuing…' : 'Issue completion letter'}</button>
        <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => issue('certificate')}>{busy === 'certificate' ? 'Issuing…' : 'Issue certificate'}</button>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Remarks for the completion letter (optional, printed on it)
        <textarea className="input" rows={2} maxLength={600} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Asha led our partnership with the college dance society and organised two on-campus stalls." />
      </label>
      {docs.length === 0 ? <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>No documents yet.</div> : (
        <table className="admin-table">
          <thead><tr><th>Document</th><th>Ref</th><th>Issued</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={{ opacity: d.status === 'revoked' || d.status === 'replaced' ? 0.5 : 1 }}>
                <td>{DOC_INFO[d.type].emoji} {DOC_INFO[d.type].title}</td>
                <td><code>{d.refNo}</code></td>
                <td>{fmt(tsToMs(d.issuedAt))}</td>
                <td>{DOC_STATUS[d.status]}{d.status === 'accepted' && d.acceptedAt ? ` · ${fmt(tsToMs(d.acceptedAt))}` : ''}</td>
                <td>
                  <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    <a className="btn btn-sm" href={view(d)} target="_blank" rel="noreferrer">View</a>
                    {d.status !== 'revoked' && d.status !== 'replaced' && <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} onClick={() => revoke(d)}>Withdraw</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const SETTINGS_FIELDS: [keyof LetterSettings, string, string][] = [
  ['signatoryName', 'Signed by (your full name)', 'e.g. Your full name'],
  ['signatoryTitle', 'Signatory title', 'Founder, DateU'],
  ['role', 'Role on the letters', 'Business Development Intern'],
  ['stipend', 'Stipend', 'e.g. ₹2,000 a month + performance incentives'],
  ['workMode', 'Work mode', 'Remote, with on-campus activities'],
  ['hours', 'Time commitment', 'Flexible, about 8 to 10 hours a week'],
  ['companyName', 'Company name', 'DateU'],
  ['email', 'Contact email', 'hello@dateu.in'],
  ['website', 'Website', 'dateu.in'],
  ['address', 'Address (optional)', 'City, State'],
]

/** What goes on every new letter (already issued letters keep what they were issued with). */
function LetterSettingsForm() {
  const { showAlert } = useDialog()
  const [s, setS] = useState<Partial<LetterSettings> | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadLetterSettings().then(setS).catch(() => setS({})) }, [])
  if (!s) return <div className="admin-card">Loading…</div>
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const clean: Partial<LetterSettings> = {}
      SETTINGS_FIELDS.forEach(([k]) => { (clean as any)[k] = String((s as any)[k] || '').trim().slice(0, 300) })
      clean.acceptDays = Math.min(60, Math.max(1, Number(s.acceptDays) || 7))
      await saveLetterSettings(clean)
      await showAlert('Saved. New letters will use these details.')
    } catch (err: any) { await showAlert(err?.message || 'Failed') } finally { setBusy(false) }
  }
  return (
    <form className="admin-card" onSubmit={save} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', alignItems: 'end' }}>
      <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13, color: 'var(--admin-text-muted)' }}>
        These details are printed on new offer letters, completion letters and certificates. Empty fields use the default shown in grey. Letters already issued don’t change; re-issue one to update it.
      </p>
      {SETTINGS_FIELDS.map(([k, label, ph]) => (
        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>{label}
          <input className="input" value={String((s as any)[k] || '')} placeholder={ph} maxLength={300} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
        </label>
      ))}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Days to accept the offer
        <input className="input" type="number" min={1} max={60} value={s.acceptDays ?? 7} onChange={(e) => setS({ ...s, acceptDays: Number(e.target.value) })} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save letter settings'}</button>
    </form>
  )
}
