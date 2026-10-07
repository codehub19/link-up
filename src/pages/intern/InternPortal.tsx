import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../state/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import { compressImage } from '../../utils/compressImage'
import {
  InternMe, InternReport, InternTask, LeaderRow, REPORT_TYPES, ReportType, deleteReport, inviteLink, loadInternDashboard,
  InternRecord, submitReport, subscribeIntern, subscribeMyReports, subscribeTasks, uploadProof,
} from '../../services/interns'
import { makePoster, promoMessages, qrDataUrl } from './promo'
import '../dashboard/dashboard.css'
import './InternPortal.css'

type Tab = 'home' | 'tasks' | 'report' | 'kit' | 'board'

const fmtDate = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')
const tsMs = (t: any) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0)

/** The intern portal: progress, tasks, work log, promotion kit and leaderboard. */
export default function InternPortal() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('home')
  const [data, setData] = useState<{ me: InternMe; leaderboard: LeaderRow[]; scoring: { completed: number; signup: number } } | null | undefined>(undefined)
  const [reports, setReports] = useState<InternReport[]>([])
  const [tasks, setTasks] = useState<InternTask[]>([])
  const [taskForReport, setTaskForReport] = useState<InternTask | null>(null)
  const [record, setRecord] = useState<InternRecord | null | undefined>(undefined)

  const refresh = () => loadInternDashboard().then(setData).catch(() => setData(null))
  useEffect(() => { if (user) refresh() }, [user])
  useEffect(() => { if (user && data) return subscribeMyReports(user.uid, setReports) }, [user, !!data])
  useEffect(() => { if (data) return subscribeTasks(setTasks) }, [!!data])
  // Finished (or former) interns still have their documents on their profile page
  useEffect(() => (user && data === null ? subscribeIntern(user.uid, setRecord) : undefined), [user?.uid, data === null])

  if (!user) return null
  if (data === undefined) return (<><Navbar /><div className="dashboard-container ip-page"><div className="ip-skel" /><div className="ip-skel" /></div></>)
  if (data === null) {
    if (record === undefined) return (<><Navbar /><div className="dashboard-container ip-page"><div className="ip-skel" /></div></>)
    if (record) return <Navigate to="/intern/profile" replace />
    return (
      <>
        <Navbar />
        <div className="dashboard-container ip-page">
          <EmptyState icon="sparkle" title="Intern portal" text="This portal is for DateU interns. If you’ve been selected, ask the DateU team to add the email you use to sign in to DateU." actions={[{ label: 'Back to DateU', onClick: () => nav('/dashboard') }]} />
        </div>
      </>
    )
  }

  const { me, leaderboard, scoring } = data
  const link = inviteLink(me.code)
  const doneTaskIds = new Set(reports.filter((r) => r.taskId && r.status !== 'changes').map((r) => r.taskId))
  const openTasks = tasks.filter((t) => !doneTaskIds.has(t.id))

  return (
    <>
      <Navbar />
      <div className="dashboard-container ip-page">
        <header className="ip-head">
          <Link to="/intern/profile" className="ip-head-me">
            <div className="ip-kicker">Business Development Intern</div>
            <h1>Hi {me.name?.split(' ')[0] || 'there'} 👋</h1>
            <span className="ip-fine">{me.internNo ? `${me.internNo} · ` : ''}My internship &amp; documents ›</span>
          </Link>
          <div className="ip-rank" title="Your rank">#{me.rank || '—'}<small>of {me.total}</small></div>
        </header>

        <nav className="ip-tabs" role="tablist">
          {([['home', 'Home'], ['tasks', `Tasks${openTasks.length ? ` (${openTasks.length})` : ''}`], ['report', 'Log work'], ['kit', 'Promo kit'], ['board', 'Leaderboard']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        {tab === 'home' && <Home me={me} link={link} scoring={scoring} reports={reports} openTasks={openTasks} go={setTab} />}
        {tab === 'tasks' && (
          <Tasks tasks={tasks} doneIds={doneTaskIds} onReport={(t) => { setTaskForReport(t); setTab('report') }} />
        )}
        {tab === 'report' && (
          <ReportTab uid={user.uid} reports={reports} tasks={openTasks} presetTask={taskForReport} onDone={() => { setTaskForReport(null); refresh() }} />
        )}
        {tab === 'kit' && <Kit link={link} code={me.code} college={me.college} />}
        {tab === 'board' && <Board rows={leaderboard} myUid={user.uid} scoring={scoring} />}
      </div>
    </>
  )
}

function Home({ me, link, scoring, reports, openTasks, go }: { me: InternMe; link: string; scoring: { completed: number; signup: number }; reports: InternReport[]; openTasks: InternTask[]; go: (t: Tab) => void }) {
  const target = me.targets?.signups || 50
  const pct = Math.min(100, Math.round((me.completed / target) * 100))
  const daysLeft = me.endAt ? Math.max(0, Math.ceil((me.endAt - Date.now()) / 86_400_000)) : null
  const copy = async () => { await navigator.clipboard.writeText(link).catch(() => { }); toast.success('Link copied') }
  return (
    <div className="ip-stack">
      {me.documents?.offer && !me.offerAcceptedAt && (
        <Link to="/intern/profile" className="ip-card ip-offer-banner">
          <span>📄</span>
          <span><strong>Your offer letter is ready</strong><small>Read it and accept it on your internship page</small></span>
          <span className="ip-btn sm">Open</span>
        </Link>
      )}
      <section className="ip-card ip-link">
        <div className="ip-label">Your invite link</div>
        <div className="ip-link-row"><code>{link}</code><button className="ip-btn sm" onClick={copy}>Copy</button></div>
        <div className="ip-fine">Code <strong>{me.code}</strong> — everyone who signs up with it counts for you (and gets free Premium days).</div>
      </section>

      <section className="ip-grid">
        <div className="ip-stat"><strong>{me.signups}</strong><span>Sign-ups</span></div>
        <div className="ip-stat"><strong>{me.completed}</strong><span>Completed profiles</span></div>
        <div className="ip-stat"><strong>{me.points}</strong><span>Work points</span></div>
        <div className="ip-stat hot"><strong>{me.score}</strong><span>Total score</span></div>
      </section>

      <section className="ip-card">
        <div className="ip-label">Target: {target} completed profiles</div>
        <div className="ip-bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="ip-fine">{me.completed} / {target} · {pct}%{daysLeft != null ? ` · ${daysLeft} days left (ends ${fmtDate(me.endAt)})` : ''}</div>
      </section>

      <section className="ip-card">
        <div className="ip-label">How your score works</div>
        <ul className="ip-list">
          <li><strong>+{scoring.completed}</strong> for each person who joins with your code and completes their profile</li>
          <li><strong>+{scoring.signup}</strong> for each sign-up that hasn’t completed yet</li>
          <li><strong>+points</strong> for each approved work log (posts, events, partnerships…)</li>
        </ul>
      </section>

      <section className="ip-row2">
        <button className="ip-card ip-action" onClick={() => go('tasks')}>
          <span>📋</span><strong>{openTasks.length} open task{openTasks.length === 1 ? '' : 's'}</strong><small>See what to do next</small>
        </button>
        <button className="ip-card ip-action" onClick={() => go('report')}>
          <span>📝</span><strong>{me.pendingReports} awaiting review</strong><small>{reports.length} logged in total</small>
        </button>
      </section>
      <Link to="/intern/profile" className="ip-card ip-action ip-docs-link">
        <span>🗂️</span><strong>My internship &amp; documents</strong><small>Offer letter, completion letter, certificate and your details</small>
      </Link>
    </div>
  )
}

function Tasks({ tasks, doneIds, onReport }: { tasks: InternTask[]; doneIds: Set<string | null | undefined>; onReport: (t: InternTask) => void }) {
  if (!tasks.length) return <EmptyState icon="inbox" title="No tasks yet" text="Your tasks from the DateU team will show up here." />
  return (
    <div className="ip-stack">
      {tasks.map((t) => {
        const done = doneIds.has(t.id)
        const due = tsMs(t.dueAt)
        return (
          <article key={t.id} className={`ip-card ip-task ${done ? 'done' : ''}`}>
            <div className="ip-task-top">
              <strong>{t.title}</strong>
              {!!t.points && <span className="ip-pill">+{t.points} pts</span>}
            </div>
            {t.description && <p>{t.description}</p>}
            <div className="ip-task-foot">
              <span className="ip-fine">{due ? `Due ${fmtDate(due)}` : ''}</span>
              {done ? <span className="ip-pill ok">Submitted</span> : <button className="ip-btn sm" onClick={() => onReport(t)}>Submit work</button>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ReportTab({ uid, reports, tasks, presetTask, onDone }: { uid: string; reports: InternReport[]; tasks: InternTask[]; presetTask: InternTask | null; onDone: () => void }) {
  const { showConfirm } = useDialog()
  const [type, setType] = useState<ReportType>('social_post')
  const [title, setTitle] = useState(presetTask?.title || '')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [reach, setReach] = useState('')
  const [taskId, setTaskId] = useState<string>(presetTask?.id || '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!link.trim() && !file) { toast.error('Add a link or a screenshot as proof.'); return }
    setBusy(true)
    try {
      const proofUrl = file ? await uploadProof(uid, await compressImage(file)) : null
      await submitReport(uid, { type, title, description, link, proofUrl, reach: reach ? Number(reach) : null, taskId: taskId || null })
      setTitle(''); setDescription(''); setLink(''); setReach(''); setFile(null); setTaskId('')
      toast.success('Logged! The team will review it.')
      onDone()
    } catch (err: any) {
      toast.error(err?.message?.includes('permission') ? 'Couldn’t save — check the link starts with https://' : 'Couldn’t save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = (s: InternReport['status']) => (s === 'approved' ? 'Approved' : s === 'changes' ? 'Needs changes' : 'In review')

  return (
    <div className="ip-stack">
      <form className="ip-card ip-form" onSubmit={submit}>
        <div className="ip-label">Log your work</div>
        <label>What did you do?
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
        </label>
        {tasks.length > 0 && (
          <label>For a task (optional)
            <select value={taskId} onChange={(e) => { setTaskId(e.target.value); const t = tasks.find((x) => x.id === e.target.value); if (t && !title) setTitle(t.title) }}>
              <option value="">—</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        )}
        <label>Title<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shared DateU in 4 hostel WhatsApp groups" required /></label>
        <label>Details<textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Where, how many people, what response you got…" /></label>
        <label>Link (post, reel, drive…)<input value={link} maxLength={500} onChange={(e) => setLink(e.target.value)} placeholder="https://instagram.com/p/…" /></label>
        <div className="ip-form-row">
          <label>Screenshot / photo<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
          <label>Approx. reach<input type="number" min={0} value={reach} onChange={(e) => setReach(e.target.value)} placeholder="e.g. 300" /></label>
        </div>
        <button className="ip-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Submit for review'}</button>
      </form>

      <div className="ip-label" style={{ marginTop: 8 }}>Your log</div>
      {!reports.length ? <div className="ip-fine">Nothing logged yet.</div> : reports.map((r) => (
        <article key={r.id} className="ip-card ip-report">
          <div className="ip-task-top">
            <strong>{REPORT_TYPES[r.type]?.emoji} {r.title}</strong>
            <span className={`ip-pill ${r.status === 'approved' ? 'ok' : r.status === 'changes' ? 'warn' : ''}`}>{statusLabel(r.status)}{r.status === 'approved' ? ` · +${r.points || 0}` : ''}</span>
          </div>
          {r.description && <p>{r.description}</p>}
          <div className="ip-report-links">
            {r.link && <a href={r.link} target="_blank" rel="noreferrer">Open link ↗</a>}
            {r.proofUrl && <a href={r.proofUrl} target="_blank" rel="noreferrer">Screenshot ↗</a>}
            {r.reach ? <span className="ip-fine">Reach ~{r.reach}</span> : null}
            <span className="ip-fine">{fmtDate(tsMs(r.createdAt))}</span>
          </div>
          {r.feedback && <div className="ip-feedback">💬 {r.feedback}</div>}
          {r.status === 'pending' && (
            <button className="ip-link-btn" onClick={async () => { if (await showConfirm('Delete this entry?')) deleteReport(r.id) }}>Delete</button>
          )}
        </article>
      ))}
    </div>
  )
}

function Kit({ link, code, college }: { link: string; code: string; college?: string | null }) {
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const messages = useMemo(() => promoMessages(link, code, college), [link, code, college])
  useEffect(() => { qrDataUrl(link).then(setQr).catch(() => { }) }, [link])

  const download = async (kind: 'feed' | 'story') => {
    setBusy(kind)
    try {
      const url = await makePoster(kind, link, code)
      const a = document.createElement('a'); a.href = url; a.download = `dateu-${kind}-${code}.png`; a.click()
    } finally { setBusy(null) }
  }
  const copy = async (t: string) => { await navigator.clipboard.writeText(t).catch(() => { }); toast.success('Copied') }

  return (
    <div className="ip-stack">
      <section className="ip-card ip-kit-qr">
        {qr && <img src={qr} alt="Your QR code" />}
        <div>
          <div className="ip-label">Your QR code</div>
          <p className="ip-fine">Put it on posters, slides and stories. It opens DateU with your code filled in.</p>
          {qr && <a className="ip-btn sm" href={qr} download={`dateu-qr-${code}.png`}>Download QR</a>}
        </div>
      </section>

      <section className="ip-card">
        <div className="ip-label">Posters with your QR</div>
        <div className="ip-row2">
          <button className="ip-btn ghost" disabled={!!busy} onClick={() => download('feed')}>{busy === 'feed' ? 'Making…' : '⬇ Post (1080×1350)'}</button>
          <button className="ip-btn ghost" disabled={!!busy} onClick={() => download('story')}>{busy === 'story' ? 'Making…' : '⬇ Story (1080×1920)'}</button>
        </div>
        <p className="ip-fine">Print the post size on A4 for notice boards, the mess and the library.</p>
      </section>

      <div className="ip-label" style={{ marginTop: 8 }}>Ready-to-send messages</div>
      {messages.map((m) => (
        <section key={m.id} className="ip-card ip-msg">
          <div className="ip-task-top"><strong>{m.label}</strong></div>
          <pre>{m.text}</pre>
          <div className="ip-row2">
            <button className="ip-btn sm ghost" onClick={() => copy(m.text)}>Copy</button>
            <a className="ip-btn sm" href={`https://wa.me/?text=${encodeURIComponent(m.text)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
          </div>
        </section>
      ))}

      <section className="ip-card">
        <div className="ip-label">Do’s and don’ts</div>
        <ul className="ip-list">
          <li>✅ Share where students already are: hostel, class, club and fest groups, your stories.</li>
          <li>✅ Talk about real uses: fest buddies, treks, gym partners, study groups.</li>
          <li>✅ Log every activity with a link or screenshot so it counts.</li>
          <li>❌ No spam, fake accounts or signing people up without asking — those don’t count and can end the internship.</li>
          <li>❌ Don’t promise things DateU doesn’t do, or call it “only a dating app”.</li>
        </ul>
      </section>
    </div>
  )
}

function Board({ rows, myUid, scoring }: { rows: LeaderRow[]; myUid: string; scoring: { completed: number; signup: number } }) {
  return (
    <div className="ip-stack">
      <p className="ip-fine">Score = {scoring.completed} × completed profiles + {scoring.signup} × other sign-ups + approved work points.</p>
      {rows.map((r, i) => (
        <div key={r.uid} className={`ip-card ip-board-row ${r.uid === myUid ? 'me' : ''}`}>
          <span className="ip-board-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
          <span className="ip-board-name"><strong>{r.name}{r.uid === myUid ? ' (you)' : ''}</strong><small>{r.college || ''}</small></span>
          <span className="ip-board-nums"><strong>{r.score}</strong><small>{r.completed} ✓ · {r.signups} sign-ups · {r.points} pts</small></span>
        </div>
      ))}
    </div>
  )
}
