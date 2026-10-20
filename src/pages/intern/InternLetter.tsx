import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import EmptyState from '../../components/ui/EmptyState'
import { InternDocument, TrackSnapshot, getInternDocument, tsToMs, verifyLink } from '../../services/interns'
import { qrDataUrl } from './promo'
import { useDocFonts } from './docFonts'
import '../dashboard/dashboard.css'
import './InternPortal.css'
import './InternDocs.css'

const longDate = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const weeks = (a: number, b: number) => Math.max(1, Math.round((b - a) / (7 * 86_400_000)))

/** Documents issued before internship profiles existed. */
const LEGACY_TRACK: TrackSnapshot = {
  key: 'business_development', title: 'Business Development Intern', department: 'Growth & Partnerships',
  summary: 'help us grow among college students by building partnerships with clubs, societies, fest teams and colleges, and by bringing new students onto the platform',
  responsibilities: [
    'Introduce the platform to students in your college and beyond, using your personal invite link and QR code.',
    'Build partnerships with clubs, societies and fest teams.',
    'Plan and run promotions on campus and online: posters, stalls, events and social media campaigns.',
    'Create content and share honest feedback from students with the team.',
    'Complete the tasks assigned to you and log your work in the intern portal.',
  ],
  learning: ['Partnership outreach and negotiation', 'Pitching and communication', 'Campaign planning and execution', 'Working with growth metrics'],
  completion: 'worked on growing the platform among college students, introducing it to students, working with clubs and societies, and running promotions on campus and online',
}

/** An offer or completion letter on an A4 letterhead ("Download PDF" prints it). */
export default function InternLetter() {
  useDocFonts()
  const { id = '' } = useParams()
  const [d, setD] = useState<InternDocument | null | undefined>(undefined)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => { getInternDocument(id).then(setD).catch(() => setD(null)) }, [id])
  useEffect(() => { if (d) qrDataUrl(verifyLink(d.id)).then(setQr).catch(() => { }) }, [d?.id])
  useEffect(() => {
    if (!d) return
    const prev = document.title
    // Becomes the file name when saved as PDF
    document.title = `${d.type === 'offer' ? 'Offer Letter' : 'Internship Completion Letter'} - ${d.name}`
    return () => { document.title = prev }
  }, [d])

  if (d === undefined) return (<><Navbar /><div className="dashboard-container ip-page"><div className="ip-skel" style={{ height: 600 }} /></div></>)
  if (d === null) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container ip-page">
          <EmptyState icon="inbox" title="Document not found" text="This document doesn’t exist, or it belongs to someone else." />
        </div>
      </>
    )
  }
  if (d.type === 'certificate') return <Navigate to={`/certificate/${d.id}`} replace />

  const s = d.settings
  const t = d.track || LEGACY_TRACK
  const role = d.role || t.title
  const company = s.companyName
  const start = tsToMs(d.startAt), end = tsToMs(d.endAt), issued = tsToMs(d.issuedAt) || Date.now()
  const first = d.name.split(' ')[0]
  const withdrawn = d.status === 'revoked' || d.status === 'replaced'
  const accepted = d.status === 'accepted'
  const copyVerify = async () => { await navigator.clipboard.writeText(verifyLink(d.id)).catch(() => { }); toast.success('Verification link copied') }
  const stats = d.stats
  const showStats = !!stats && (stats.signups > 0 || stats.approvedReports > 0)

  return (
    <>
      <Navbar />
      <div className="dashboard-container il-wrap">
        <div className="il-toolbar no-print">
          <button className="ip-btn" onClick={() => window.print()}>⬇ Download PDF</button>
          <button className="ip-btn ghost" onClick={copyVerify}>Copy verification link</button>
        </div>
        <p className="il-tip no-print">On a phone: Download PDF → choose “Save as PDF” as the printer.</p>
        {withdrawn && <div className="il-withdrawn no-print">{d.status === 'replaced' ? 'A newer copy of this document has been issued. This copy is no longer valid.' : 'This document has been withdrawn and is no longer valid.'}</div>}

        <article className={`il-paper ${withdrawn ? 'void' : ''}`}>
          <header className="il-head">
            <div className="il-logo">
              <img src="/icons/icon-192.png" alt="" />
              <div>
                <strong>{company}</strong>
                <span>Social platform for college students</span>
              </div>
            </div>
            <address className="il-head-contact">
              <span>{s.website}</span>
              <span>{s.email}</span>
              {s.address && <span>{s.address}</span>}
            </address>
          </header>
          <div className="il-rule" />

          <div className="il-titlebar">
            <div className="il-doctitle">{d.type === 'offer' ? 'Offer Letter' : 'Internship Completion Letter'}</div>
            <dl className="il-refs">
              <div><dt>Reference</dt><dd>{d.refNo}</dd></div>
              <div><dt>Date</dt><dd>{longDate(issued)}</dd></div>
              <div><dt>Intern ID</dt><dd>{d.internNo}</dd></div>
            </dl>
          </div>

          {d.type === 'offer' ? (
            <div className="il-body">
              <div className="il-addressee">
                <span>To</span>
                <strong>{d.name}</strong>
                {d.college && <span>{d.college}</span>}
              </div>

              <p className="il-subj"><b>Subject:</b> Offer of internship as {role}</p>

              <p>Dear {first},</p>
              <p>
                We are delighted to offer you the position of <b>{role}</b> in the <b>{t.department}</b> team at <b>{company}</b>.
                In this role, you will {t.summary}.
              </p>
              <p>We were impressed by your application and look forward to the energy and ideas you will bring. The details of your internship are set out below.</p>

              <section className="il-section">
                <h2><span>1</span>Internship details</h2>
                <table className="il-kv">
                  <tbody>
                    <tr><th>Position</th><td>{role}</td></tr>
                    <tr><th>Department</th><td>{t.department}</td></tr>
                    <tr><th>Duration</th><td>{weeks(start, end)} weeks · {longDate(start)} to {longDate(end)}</td></tr>
                    <tr><th>Work mode</th><td>{s.workMode}</td></tr>
                    <tr><th>Time commitment</th><td>{s.hours}</td></tr>
                    <tr><th>Stipend</th><td>{s.stipend}</td></tr>
                    <tr><th>Reporting to</th><td>{s.signatoryName ? `${s.signatoryName}, ${s.signatoryTitle}` : s.signatoryTitle}</td></tr>
                  </tbody>
                </table>
              </section>

              <section className="il-section">
                <h2><span>2</span>Roles and responsibilities</h2>
                <ul className="il-list">{t.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>

              <section className="il-section">
                <h2><span>3</span>What you will gain</h2>
                <ul className="il-gains">
                  {t.learning.map((l) => <li key={l}>{l}</li>)}
                  <li>Completion letter and verifiable certificate</li>
                  <li>Mentorship from the founding team</li>
                </ul>
              </section>

              <section className="il-section il-terms">
                <h2><span>4</span>Terms and conditions</h2>
                <ol>
                  <li><b>Nature of engagement.</b> This is an internship for learning and experience. It is not an offer of employment and does not create an employer–employee relationship.</li>
                  <li><b>Confidentiality.</b> You will keep confidential all non-public information about {company}, its users, data, product and plans, during the internship and after it ends.</li>
                  <li><b>Conduct.</b> You will represent {company} honestly and respectfully: no spam, no fake accounts, no signing people up without their consent and no misleading claims. You will follow the Community Guidelines.</li>
                  <li><b>Performance.</b> Your work is tracked in the intern portal. A completion letter and certificate of completion are issued on successful completion of the internship.</li>
                  <li><b>Intellectual property.</b> Content, designs, code and other material you create for {company} during the internship belong to {company} and may be used by it.</li>
                  <li><b>Termination.</b> Either party may end the internship early with 7 days’ written notice. {company} may end it with immediate effect in case of misconduct or a breach of these terms.</li>
                </ol>
              </section>

              <p>
                To accept this offer, please sign it electronically from your intern portal on or before <b>{longDate(tsToMs(d.respondBy))}</b>.
                The offer lapses if it is not accepted by then.
              </p>
              <p>Congratulations once again. We look forward to welcoming you to the team.</p>

              <div className="il-signs">
                <Signatory s={s} />
                <div className="il-signblock">
                  <div className="il-sign-label">Accepted by the intern</div>
                  <div className="il-sign-mark">{accepted ? <span className="il-script">{d.acceptedName || d.name}</span> : null}</div>
                  <div className="il-sign-line" />
                  <strong>{d.name}</strong>
                  <span>{accepted ? `Signed electronically on ${longDate(tsToMs(d.acceptedAt))}` : 'Awaiting signature'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="il-body">
              <p className="il-twimc">To Whom It May Concern</p>
              <p>
                This is to certify that <b>{d.name}</b>{d.college ? <>, a student of <b>{d.college}</b>,</> : ''} has successfully completed an internship
                with <b>{company}</b> as a <b>{role}</b> in the <b>{t.department}</b> team, from <b>{longDate(start)}</b> to <b>{longDate(end)}</b>.
              </p>
              <p>During the internship, {first} {t.completion}.</p>

              {showStats && (
                <section className="il-section">
                  <h2>Contribution highlights</h2>
                  <table className="il-kv">
                    <tbody>
                      {stats!.signups > 0 && <tr><th>Students onboarded through {first}’s outreach</th><td>{stats!.signups}</td></tr>}
                      {stats!.completed > 0 && <tr><th>Of these, completed profiles</th><td>{stats!.completed}</td></tr>}
                      {stats!.approvedReports > 0 && <tr><th>Assignments completed and verified</th><td>{stats!.approvedReports}</td></tr>}
                    </tbody>
                  </table>
                </section>
              )}

              {d.remarks && (
                <section className="il-section">
                  <h2>Remarks</h2>
                  <p>{d.remarks}</p>
                </section>
              )}

              <p>We thank {first} for their contribution to {company} and wish them every success in their future endeavours.</p>

              <div className="il-signs single">
                <Signatory s={s} />
              </div>
            </div>
          )}

          <footer className="il-foot">
            <div className="il-verify">
              {qr && <img src={qr} alt="" />}
              <div>
                <b>Digitally issued document</b>
                <span>Scan the code or visit {verifyLink(d.id).replace('https://', '')} to verify it.</span>
              </div>
            </div>
            <div className="il-foot-co">{company} · {s.website} · {s.email}</div>
          </footer>
          {withdrawn && <div className="il-void-mark">{d.status === 'replaced' ? 'REPLACED' : 'WITHDRAWN'}</div>}
        </article>
      </div>
    </>
  )
}

function Signatory({ s }: { s: InternDocument['settings'] }) {
  return (
    <div className="il-signblock">
      <div className="il-sign-label">For {s.companyName}</div>
      <div className="il-sign-mark">
        {s.signatureUrl ? <img src={s.signatureUrl} alt="" /> : <span className="il-script">{s.signatoryName || s.companyName}</span>}
      </div>
      <div className="il-sign-line" />
      <strong>{s.signatoryName || 'Authorised signatory'}</strong>
      <span>{s.signatoryTitle}</span>
    </div>
  )
}
