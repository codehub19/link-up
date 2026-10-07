import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import EmptyState from '../../components/ui/EmptyState'
import { InternDocument, getInternDocument, tsToMs, verifyLink } from '../../services/interns'
import { qrDataUrl } from './promo'
import '../dashboard/dashboard.css'
import './InternPortal.css'
import './InternDocs.css'

const longDate = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const weeks = (a: number, b: number) => Math.max(1, Math.round((b - a) / (7 * 86_400_000)))

/** An offer or completion letter, laid out as an A4 page ("Download PDF" prints it). */
export default function InternLetter() {
  const { id = '' } = useParams()
  const [d, setD] = useState<InternDocument | null | undefined>(undefined)
  const [qr, setQr] = useState<string | null>(null)

  // Handwriting font for the signature
  useEffect(() => {
    if (document.getElementById('font-great-vibes')) return
    const l = document.createElement('link')
    l.id = 'font-great-vibes'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap'
    document.head.appendChild(l)
  }, [])
  useEffect(() => { getInternDocument(id).then(setD).catch(() => setD(null)) }, [id])
  useEffect(() => { if (d) qrDataUrl(verifyLink(d.id)).then(setQr).catch(() => { }) }, [d?.id])
  useEffect(() => {
    if (!d) return
    const prev = document.title
    // Becomes the file name when saved as PDF
    document.title = `${d.type === 'offer' ? 'Offer Letter' : 'Completion Letter'} - ${d.name} - DateU`
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
  const start = tsToMs(d.startAt), end = tsToMs(d.endAt), issued = tsToMs(d.issuedAt) || Date.now()
  const first = d.name.split(' ')[0]
  const withdrawn = d.status === 'revoked' || d.status === 'replaced'
  const signer = s.signatoryName || s.companyName
  const copyVerify = async () => { await navigator.clipboard.writeText(verifyLink(d.id)).catch(() => { }); toast.success('Verification link copied') }

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
          <header className="il-letterhead">
            <div className="il-brand">
              <img src="/icons/icon-192.png" alt="" />
              <div>
                <strong>{s.companyName}</strong>
                <span>Make new friends from every college</span>
              </div>
            </div>
            <div className="il-contact">
              <span>{s.website}</span>
              <span>{s.email}</span>
              {s.address && <span>{s.address}</span>}
            </div>
          </header>

          <div className="il-meta">
            <span>Ref: <strong>{d.refNo}</strong></span>
            <span>Date: <strong>{longDate(issued)}</strong></span>
          </div>

          {d.type === 'offer' ? (
            <>
              <div className="il-to">
                <div>To,</div>
                <strong>{d.name}</strong>
                {d.college && <div>{d.college}</div>}
                <div>Intern ID: {d.internNo}</div>
              </div>

              <h1 className="il-subject">Subject: Offer of Internship — {d.role}</h1>

              <p>Dear {first},</p>
              <p>
                We are pleased to offer you an internship with <strong>{s.companyName}</strong> as a <strong>{d.role}</strong>.
                {' '}{s.companyName} helps college students make new friends beyond their own circle — finding buddies for events, joining interest groups and planning things together —
                and we are glad to have you on the team to help it grow.
              </p>

              <table className="il-table">
                <tbody>
                  <tr><th>Position</th><td>{d.role}</td></tr>
                  <tr><th>Internship period</th><td>{longDate(start)} to {longDate(end)} ({weeks(start, end)} weeks)</td></tr>
                  <tr><th>Work mode</th><td>{s.workMode}</td></tr>
                  <tr><th>Time commitment</th><td>{s.hours}</td></tr>
                  <tr><th>Stipend</th><td>{s.stipend}</td></tr>
                  <tr><th>Reporting to</th><td>{s.signatoryName ? `${s.signatoryName}, ${s.signatoryTitle}` : s.signatoryTitle}</td></tr>
                </tbody>
              </table>

              <h2>Your responsibilities</h2>
              <ul>
                <li>Introduce {s.companyName} to students in your college and beyond, using your personal invite link and QR code.</li>
                <li>Build partnerships with clubs, societies and fest teams.</li>
                <li>Plan and run promotions on campus and online: posters, stalls, events and social media campaigns.</li>
                <li>Create content and share honest feedback from students with the team.</li>
                <li>Complete the tasks assigned to you and log your work in the intern portal.</li>
              </ul>

              <h2>Terms of the internship</h2>
              <ol>
                <li>This is an internship and not an offer of employment.</li>
                <li>You will keep confidential any non-public information about {s.companyName}, its users and its plans, during and after the internship.</li>
                <li>You will promote {s.companyName} honestly: no spam, no fake accounts, no signing people up without their consent and no misleading claims.</li>
                <li>Your performance is measured in the intern portal (sign-ups through your invite link and the work you log). A completion letter and a certificate of completion are issued on successful completion.</li>
                <li>Either side may end the internship early with 7 days’ notice. {s.companyName} may end it immediately in case of misconduct or a breach of these terms.</li>
                <li>Content, designs and other material you create for {s.companyName} during the internship may be used by {s.companyName}.</li>
              </ol>

              <p>Please accept this offer from your intern portal by <strong>{longDate(tsToMs(d.respondBy))}</strong>. We look forward to working with you.</p>
            </>
          ) : (
            <>
              <h1 className="il-subject center">To Whom It May Concern</h1>
              <h2 className="il-center-sub">Internship Completion Letter</h2>

              <p>
                This is to certify that <strong>{d.name}</strong>{d.college ? <>, a student of <strong>{d.college}</strong>,</> : ''} has
                successfully completed an internship with <strong>{s.companyName}</strong> as a <strong>{d.role}</strong> from <strong>{longDate(start)}</strong> to <strong>{longDate(end)}</strong> (Intern ID {d.internNo}).
              </p>
              <p>
                During the internship, {first} worked on growing {s.companyName} among college students — introducing the platform to students,
                working with clubs and societies, and running promotions on campus and online.
              </p>

              {d.stats && (d.stats.signups > 0 || d.stats.approvedReports > 0) && (
                <table className="il-table">
                  <tbody>
                    {d.stats.signups > 0 && <tr><th>Students who joined through {first}’s invite link</th><td>{d.stats.signups}</td></tr>}
                    {d.stats.completed > 0 && <tr><th>Of these, completed profiles</th><td>{d.stats.completed}</td></tr>}
                    {d.stats.approvedReports > 0 && <tr><th>Activities completed and verified</th><td>{d.stats.approvedReports}</td></tr>}
                  </tbody>
                </table>
              )}

              {d.remarks && <p>{d.remarks}</p>}

              <p>We thank {first} for their contribution and wish them every success in the future.</p>
            </>
          )}

          <footer className="il-sign">
            <div>
              <div>Warm regards,</div>
              <div className="il-signature">{signer}</div>
              {s.signatoryName && <strong>{s.signatoryName}</strong>}
              <div>{s.signatoryTitle}</div>
            </div>
            {d.type === 'offer' && (
              <div className={`il-accept ${d.status === 'accepted' ? 'ok' : ''}`}>
                <div className="il-accept-title">Acceptance</div>
                {d.status === 'accepted'
                  ? <>Accepted by <strong>{d.acceptedName || d.name}</strong> on {longDate(tsToMs(d.acceptedAt))}, electronically through the {s.companyName} intern portal.</>
                  : <>Awaiting acceptance.</>}
              </div>
            )}
          </footer>

          <div className="il-verify">
            {qr && <img src={qr} alt="" />}
            <div>
              This document was issued digitally by {s.companyName}. Check that it is genuine at<br />
              <strong>{verifyLink(d.id).replace('https://', '')}</strong>
            </div>
          </div>
          {withdrawn && <div className="il-void-mark">{d.status === 'replaced' ? 'REPLACED' : 'WITHDRAWN'}</div>}
        </article>
      </div>
    </>
  )
}
