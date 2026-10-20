import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { INTERN_TRACKS, InternRequest, InternTrackKey, REQUEST_SOURCES, submitJoinRequest, subscribeMyRequest } from '../../services/interns'
import '../dashboard/dashboard.css'
import './InternPortal.css'
import './InternDocs.css'
import './InternJoin.css'

const YEARS = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Postgraduate', 'Recently graduated']

/**
 * dateu.in/intern for anyone who isn't an approved intern yet: what to do to start,
 * the joining form, and where their request stands.
 */
export default function InternJoin() {
  const { user, profile, login, logout, loading } = useAuth()
  const [request, setRequest] = useState<InternRequest | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)

  useEffect(() => (user ? subscribeMyRequest(user.uid, setRequest) : setRequest(null)), [user?.uid])

  const signIn = async () => { try { await login() } catch { toast.error('Sign-in was cancelled. Try again.') } }

  // 1 sign in · 2 details · 3 approval · 4 offer letter · 5 start
  const status = request?.status
  const step = !user ? 1 : !request || status === 'rejected' || editing ? 2 : 3
  const showForm = !!user && request !== undefined && (!request || editing || status === 'rejected')

  return (
    <>
      <Navbar />
      <div className="dashboard-container ip-page ij-page">
        <section className="ij-hero">
          <div className="ip-kicker">DateU Internship Program</div>
          <h1>Welcome! Let’s get you started 🚀</h1>
          <p>Selected for a DateU internship? Follow the steps below to join. Your intern portal (invite link, tasks, promotion kit and documents) unlocks as soon as the DateU team approves you.</p>
        </section>

        <ol className="ij-steps">
          <Step n={1} state={step > 1 ? 'done' : 'now'} title="Sign in with Google"
            text={user ? <>Signed in as <b>{user.email}</b>. <button className="ip-link-btn" onClick={() => logout()}>Use a different account</button></> : 'Use the same Gmail address you applied with or that we emailed. Your internship is linked to this account.'}>
            {!user && !loading && <button className="ip-btn" onClick={signIn}>Continue with Google</button>}
          </Step>

          <Step n={2} state={step > 2 ? 'done' : step === 2 ? 'now' : 'next'} title="Send your joining details"
            text="Your full name exactly as it should appear on your offer letter and certificate, your college and how to reach you.">
            {status === 'rejected' && !editing && (
              <div className="ij-rejected">
                <b>Your last request wasn’t approved.</b>
                <p className="ip-fine">{request?.reason || 'This usually means we couldn’t match your details to the selection list.'} Check your details below and send them again, or write to <a href="mailto:hello@dateu.in?subject=Internship%20joining">hello@dateu.in</a>.</p>
              </div>
            )}
            {showForm && user && (
              <JoinForm
                key={`${status || 'new'}-${request?.updatedAt?.seconds || 0}`}
                initial={request || null}
                resend={status === 'rejected'}
                defaults={{ name: profile?.name || user.displayName || '', college: (profile as any)?.college || '' }}
                uid={user.uid} email={user.email || ''}
                onDone={() => setEditing(false)}
                onCancel={request && status === 'pending' ? () => setEditing(false) : undefined}
              />
            )}
          </Step>

          <Step n={3} state={step === 3 ? 'now' : 'next'} title="Approval by the DateU team"
            text="We check your details against the selection list. This usually takes 24 to 48 hours, and you’ll get an email and a notification.">
            {status === 'pending' && !editing && request && (
              <div className="ij-wait">
                <div className="ij-wait-top"><span className="ij-pulse" /> <b>Waiting for approval</b></div>
                <dl className="ij-summary">
                  <div><dt>Name</dt><dd>{request.name}</dd></div>
                  <div><dt>College</dt><dd>{request.college}{request.year ? ` · ${request.year}` : ''}</dd></div>
                  <div><dt>Profile</dt><dd>{INTERN_TRACKS[request.track]?.title}</dd></div>
                  <div><dt>WhatsApp</dt><dd>{request.phone}</dd></div>
                </dl>
                <button className="ip-btn sm ghost" onClick={() => setEditing(true)}>Edit details</button>
              </div>
            )}
          </Step>

          <Step n={4} state="next" title="Accept your offer letter"
            text="Once approved, your offer letter appears on your intern profile. Read it, check your name, and sign it by typing your full name." />

          <Step n={5} state="next" title="Start working"
            text="Open your portal at dateu.in/intern to get your personal invite link and QR code, your tasks and the promotion kit. Log everything you do in “Log work”; it counts towards your completion letter." />
        </ol>

        <section className="ip-card">
          <div className="ip-label">What you’ll get</div>
          <ul className="ij-gets">
            <li><span>📄</span>Offer letter, signed online</li>
            <li><span>📜</span>Completion letter</li>
            <li><span>🏅</span>Certificate you can verify and add to LinkedIn</li>
            <li><span>🧭</span>Mentorship from the founding team</li>
            <li><span>💰</span>Stipend as stated in your offer letter</li>
            <li><span>🏆</span>Leaderboard and recognition for top interns</li>
          </ul>
        </section>

        <section className="ip-card ij-faq">
          <div className="ip-label">Questions</div>
          <details><summary>I haven’t been selected yet. Can I join?</summary><p>The portal is only for selected candidates. Apply through our internship listing, and if you’re selected we’ll email you the next steps.</p></details>
          <details><summary>Which email should I use?</summary><p>The Gmail you applied with, or the one our selection email was sent to. If you need to use a different one, mention it in the note in step 2.</p></details>
          <details><summary>How long does approval take?</summary><p>Usually 24 to 48 hours. You’ll be notified by email and in the app as soon as it’s done.</p></details>
          <details><summary>Can I use my laptop?</summary><p>Yes. The intern portal and your documents work on both laptop and phone.</p></details>
          <details><summary>I made a mistake in my details.</summary><p>Tap “Edit details” in step 3 while you’re waiting. After approval, you can update your phone and LinkedIn on your intern profile; for your name, write to hello@dateu.in.</p></details>
        </section>

        <p className="ip-fine ij-contact">Need help? Write to <a href="mailto:hello@dateu.in?subject=Internship%20joining">hello@dateu.in</a></p>
      </div>
    </>
  )
}

function Step({ n, state, title, text, children }: { n: number; state: 'done' | 'now' | 'next'; title: string; text: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className={`ij-step ${state}`}>
      <span className="ij-dot">{state === 'done' ? '✓' : n}</span>
      <div className="ij-step-body">
        <strong>{title}</strong>
        <div className="ip-fine">{text}</div>
        {children && <div className="ij-step-extra">{children}</div>}
      </div>
    </li>
  )
}

function JoinForm({ uid, email, initial, resend, defaults, onDone, onCancel }: {
  uid: string; email: string; initial: InternRequest | null; resend?: boolean; defaults: { name: string; college: string }
  onDone: () => void; onCancel?: () => void
}) {
  const [name, setName] = useState(initial?.name || defaults.name)
  const [college, setCollege] = useState(initial?.college || defaults.college)
  const [year, setYear] = useState(initial?.year || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [linkedin, setLinkedin] = useState(initial?.linkedin || '')
  const [track, setTrack] = useState<InternTrackKey>(initial?.track || 'business_development')
  const [source, setSource] = useState(initial?.source || 'Unstop')
  const [applicationId, setApplicationId] = useState(initial?.applicationId || '')
  const [note, setNote] = useState(initial?.note || '')
  const [agree, setAgree] = useState(!!initial && !resend)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().split(/\s+/).length < 2) { toast.error('Enter your full name (first and last name).'); return }
    if (!/^[+0-9 ()-]{8,20}$/.test(phone.trim())) { toast.error('Enter a valid WhatsApp number.'); return }
    if (linkedin.trim() && !/^https:\/\/([a-z]+\.)?linkedin\.com\/.+/.test(linkedin.trim())) { toast.error('Paste your full LinkedIn link (https://www.linkedin.com/in/…) or leave it empty.'); return }
    setBusy(true)
    try {
      await submitJoinRequest(uid, email, { name, college, year, phone, linkedin, track, source, applicationId, note })
      toast.success('Sent! We’ll let you know once you’re approved.')
      onDone()
    } catch {
      toast.error('Couldn’t send. Check your details and try again.')
    } finally { setBusy(false) }
  }

  return (
    <form className="ip-form ij-form" onSubmit={submit}>
      <label>Full name (as on your certificate)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" required /></label>
      <div className="ip-form-row">
        <label>College<input value={college} onChange={(e) => setCollege(e.target.value)} maxLength={120} placeholder="e.g. Indian Institute of Technology Delhi" required /></label>
        <label>Year
          <select value={year} onChange={(e) => setYear(e.target.value)} required>
            <option value="" disabled>Select</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <div className="ip-form-row">
        <label>WhatsApp number<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="+91 …" required /></label>
        <label>LinkedIn (optional)<input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} maxLength={200} placeholder="https://www.linkedin.com/in/…" /></label>
      </div>
      <label>Internship profile you were selected for
        <select value={track} onChange={(e) => setTrack(e.target.value as InternTrackKey)}>
          {Object.entries(INTERN_TRACKS).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
        </select>
      </label>
      <div className="ip-form-row">
        <label>Where did you apply?
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {REQUEST_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Application ID (optional)<input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} maxLength={60} placeholder="e.g. from Unstop" /></label>
      </div>
      <label>Note for the team (optional)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Anything we should know, e.g. you applied with a different email" /></label>
      <label className="idp-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I confirm these details are correct and I was selected for the DateU internship.</label>
      <div className="ij-form-actions">
        <button className="ip-btn" type="submit" disabled={busy || !agree}>{busy ? 'Sending…' : resend ? 'Send again' : initial ? 'Save changes' : 'Send for approval'}</button>
        {onCancel && <button type="button" className="ip-btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
