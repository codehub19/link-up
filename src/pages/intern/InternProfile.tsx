import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../state/AuthContext'
import { photoOf } from '../../utils/avatar'
import {
  DOC_INFO, InternDocType, InternDocument, InternMe, InternRecord, acceptOffer, inviteLink, isLive, linkedInAddUrl, loadInternDashboard,
  saveMyInternDetails, subscribeIntern, subscribeMyDocuments, tsToMs, verifyLink,
} from '../../services/interns'
import '../dashboard/dashboard.css'
import './InternPortal.css'
import './InternDocs.css'

const fmt = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const STATUS: Record<InternRecord['status'], [string, string]> = { active: ['Active', 'ok'], completed: ['Completed', 'ok'], removed: ['Ended', 'warn'] }

/** The intern's own page: their internship details, documents and contact details. */
export default function InternProfile() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [intern, setIntern] = useState<InternRecord | null | undefined>(undefined)
  const [docs, setDocs] = useState<InternDocument[]>([])
  const [me, setMe] = useState<InternMe | null>(null)

  useEffect(() => (user ? subscribeIntern(user.uid, setIntern) : undefined), [user?.uid])
  useEffect(() => (user && intern ? subscribeMyDocuments(user.uid, setDocs) : undefined), [user?.uid, !!intern])
  useEffect(() => { if (intern?.status === 'active') loadInternDashboard().then((r) => setMe(r.me)).catch(() => { }) }, [intern?.status])

  if (!user) return null
  if (intern === undefined) return (<><Navbar /><div className="dashboard-container ip-page"><div className="ip-skel" /><div className="ip-skel" /></div></>)
  if (intern === null) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container ip-page">
          <EmptyState icon="sparkle" title="Intern profile" text="This page is for DateU interns." actions={[{ label: 'Back to DateU', onClick: () => nav('/dashboard') }]} />
        </div>
      </>
    )
  }

  const live = docs.filter(isLive)
  const latest = (t: InternDocType) => live.find((d) => d.type === t) || null
  const offer = latest('offer')
  const start = tsToMs(intern.startAt), end = tsToMs(intern.endAt)
  const daysLeft = intern.status === 'active' && end ? Math.max(0, Math.ceil((end - Date.now()) / 86_400_000)) : null
  const settings = offer?.settings
  const [statusLabel, statusTone] = STATUS[intern.status] || STATUS.active
  const stats = me || live.find((d) => d.type === 'completion')?.stats || null

  return (
    <>
      <Navbar />
      <div className="dashboard-container ip-page">
        <section className="ip-card idp-hero">
          <img src={photoOf({ ...profile, uid: user.uid })} alt="" />
          <div className="idp-hero-text">
            <h1>{intern.docName || intern.name}</h1>
            <div className="ip-kicker">{settings?.role || 'Business Development Intern'} · DateU</div>
            <div className="idp-hero-meta">
              <span className={`ip-pill ${statusTone}`}>{statusLabel}</span>
              {intern.internNo && <span className="ip-pill">ID {intern.internNo}</span>}
              {intern.college && <span className="ip-fine">{intern.college}</span>}
            </div>
          </div>
        </section>

        {offer && offer.status === 'issued' && <AcceptOffer offer={offer} />}

        <div className="ip-label idp-section">My documents</div>
        <div className="ip-stack">
          {(['offer', 'completion', 'certificate'] as InternDocType[]).map((t) => <DocRow key={t} type={t} d={latest(t)} />)}
        </div>

        <div className="ip-label idp-section">Internship details</div>
        <section className="ip-card">
          <dl className="idp-dl">
            <div><dt>Role</dt><dd>{settings?.role || 'Business Development Intern'}</dd></div>
            <div><dt>Intern ID</dt><dd>{intern.internNo || '—'}</dd></div>
            <div><dt>Start date</dt><dd>{fmt(start)}</dd></div>
            <div><dt>End date</dt><dd>{fmt(end)}{daysLeft != null ? ` · ${daysLeft} days left` : ''}</dd></div>
            {settings && <div><dt>Work mode</dt><dd>{settings.workMode}</dd></div>}
            {settings && <div><dt>Time commitment</dt><dd>{settings.hours}</dd></div>}
            {settings && <div><dt>Stipend</dt><dd>{settings.stipend}</dd></div>}
            {settings && <div><dt>Reporting to</dt><dd>{settings.signatoryName ? `${settings.signatoryName}, ${settings.signatoryTitle}` : settings.signatoryTitle}</dd></div>}
            <div><dt>Invite code</dt><dd><code>{intern.code}</code></dd></div>
            <div><dt>Target</dt><dd>{intern.targets?.signups || 50} completed sign-ups</dd></div>
          </dl>
        </section>

        {stats && (
          <>
            <div className="ip-label idp-section">Performance</div>
            <section className="ip-grid">
              <div className="ip-stat"><strong>{stats.signups}</strong><span>Sign-ups</span></div>
              <div className="ip-stat"><strong>{stats.completed}</strong><span>Completed profiles</span></div>
              <div className="ip-stat"><strong>{me ? `#${me.rank}` : stats.approvedReports}</strong><span>{me ? `Rank of ${me.total}` : 'Approved activities'}</span></div>
              <div className="ip-stat hot"><strong>{stats.score}</strong><span>Score</span></div>
            </section>
          </>
        )}

        <div className="ip-label idp-section">Details for your documents</div>
        <DetailsForm uid={user.uid} intern={intern} />

        <div className="ip-label idp-section">Important</div>
        <section className="ip-card">
          <ul className="ip-list">
            <li><strong>Code of conduct:</strong> promote DateU honestly. No spam, fake accounts, paid or forced sign-ups, or misleading claims; these don’t count and can end the internship.</li>
            <li><strong>Confidentiality:</strong> don’t share anything about DateU’s users, numbers or plans that isn’t public.</li>
            <li><strong>Log as you go:</strong> add every activity in <em>Log work</em> with a link or screenshot. Your completion letter uses these numbers.</li>
            <li><strong>Completion:</strong> when your internship ends, your completion letter and certificate appear here. You can add the certificate to LinkedIn in one tap.</li>
            <li><strong>Leaving early:</strong> tell the team at least 7 days before.</li>
          </ul>
        </section>

        <section className="ip-card idp-help">
          <div>
            <div className="ip-label">Need help?</div>
            <div className="ip-fine">Questions about tasks, documents or your score: write to <a href="mailto:hello@dateu.in?subject=DateU%20internship">hello@dateu.in</a>{intern.internNo ? ` and mention your intern ID ${intern.internNo}` : ''}.</div>
          </div>
          {intern.status === 'active' && <Link className="ip-btn sm" to="/intern">Open portal</Link>}
        </section>

        {intern.status === 'active' && (
          <p className="ip-fine idp-section">Your invite link: <a href={inviteLink(intern.code)}>{inviteLink(intern.code).replace('https://', '')}</a></p>
        )}
      </div>
    </>
  )
}

function DocRow({ type, d }: { type: InternDocType; d: InternDocument | null }) {
  const info = DOC_INFO[type]
  const viewUrl = d ? (type === 'certificate' ? `/certificate/${d.id}` : `/intern/documents/${d.id}`) : ''
  const copy = async () => { if (d) { await navigator.clipboard.writeText(verifyLink(d.id)).catch(() => { }); toast.success('Verification link copied') } }
  return (
    <article className={`ip-card idp-doc ${d ? '' : 'pending'}`}>
      <span className="idp-doc-icon">{info.emoji}</span>
      <div className="idp-doc-body">
        <strong>{info.title}</strong>
        {d ? (
          <span className="ip-fine">
            {d.refNo} · issued {fmt(tsToMs(d.issuedAt))}
            {type === 'offer' && (d.status === 'accepted' ? ' · accepted ✅' : ' · waiting for you to accept')}
          </span>
        ) : <span className="ip-fine">Not issued yet. {info.when}.</span>}
        {d && (
          <div className="idp-doc-actions">
            <Link className="ip-btn sm" to={viewUrl}>View &amp; download</Link>
            {type === 'certificate' && <a className="ip-btn sm ghost" href={linkedInAddUrl(d)} target="_blank" rel="noreferrer">Add to LinkedIn</a>}
            <button className="ip-btn sm ghost" onClick={copy}>Verification link</button>
          </div>
        )}
      </div>
    </article>
  )
}

function AcceptOffer({ offer }: { offer: InternDocument }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const by = tsToMs(offer.respondBy)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await acceptOffer(offer.id, name)
      toast.success('Offer accepted. Welcome to the team! 🎉')
    } catch (err: any) {
      toast.error(err?.message || 'Couldn’t accept. Try again.')
    } finally { setBusy(false) }
  }
  return (
    <section className="ip-card idp-offer">
      <div className="ip-task-top">
        <div>
          <strong>🎉 Your offer letter is ready</strong>
          <div className="ip-fine">Read it and accept{by ? ` by ${fmt(by)}` : ''}.</div>
        </div>
        <Link className="ip-btn sm ghost" to={`/intern/documents/${offer.id}`}>Read</Link>
      </div>
      {!open ? (
        <button className="ip-btn" style={{ marginTop: 12, width: '100%' }} onClick={() => setOpen(true)}>Accept offer</button>
      ) : (
        <form className="ip-form" style={{ marginTop: 12 }} onSubmit={submit}>
          <label>Type your full name to sign: <em>{offer.name}</em>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={offer.name} required />
          </label>
          <label className="idp-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read the offer letter and accept its terms.</label>
          <button className="ip-btn" type="submit" disabled={busy || !agree || !name.trim()}>{busy ? 'Accepting…' : 'Sign and accept'}</button>
        </form>
      )}
    </section>
  )
}

function DetailsForm({ uid, intern }: { uid: string; intern: InternRecord }) {
  const [docName, setDocName] = useState(intern.docName || intern.name || '')
  const [phone, setPhone] = useState(intern.phone || '')
  const [linkedin, setLinkedin] = useState(intern.linkedin || '')
  const [busy, setBusy] = useState(false)
  const locked = !!intern.docsIssued
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const li = linkedin.trim()
    if (li && !/^https:\/\/([a-z]+\.)?linkedin\.com\/.+/.test(li)) { toast.error('Paste your full LinkedIn profile link (https://www.linkedin.com/in/…)'); return }
    if (!/^[+0-9 ()-]{0,20}$/.test(phone.trim())) { toast.error('Enter a valid phone number'); return }
    setBusy(true)
    try {
      await saveMyInternDetails(uid, { ...(locked ? {} : { docName: docName.trim().replace(/\s+/g, ' ').slice(0, 60) }), phone: phone.trim(), linkedin: li })
      toast.success('Saved')
    } catch {
      toast.error('Couldn’t save. Try again.')
    } finally { setBusy(false) }
  }
  return (
    <form className="ip-card ip-form" onSubmit={save}>
      <label>Full name (as it should appear on your documents)
        <input value={docName} onChange={(e) => setDocName(e.target.value)} maxLength={60} disabled={locked} required />
        <span className="ip-fine">{locked ? 'Locked because a document has been issued. To correct it, email hello@dateu.in.' : 'Check the spelling: this name is printed on your offer letter and certificate.'}</span>
      </label>
      <div className="ip-form-row">
        <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="+91 …" /></label>
        <label>LinkedIn profile<input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} maxLength={200} placeholder="https://www.linkedin.com/in/…" /></label>
      </div>
      <button className="ip-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
