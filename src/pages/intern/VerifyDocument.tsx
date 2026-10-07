import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { useSeo } from '../../utils/seo'
import { verifyDocument } from '../../services/interns'
import '../dashboard/dashboard.css'
import './InternPortal.css'
import './InternDocs.css'

type Result = Awaited<ReturnType<typeof verifyDocument>>
const fmt = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const TITLE = { offer: 'Offer letter', completion: 'Internship completion letter', certificate: 'Certificate of completion' }

/** Public page: is this DateU internship document genuine? (linked from the QR code on each document) */
export default function VerifyDocument() {
  useSeo({ title: 'Verify a document', noindex: true })
  const { id = '' } = useParams()
  const [r, setR] = useState<Result | null | undefined>(undefined)
  useEffect(() => { verifyDocument(id).then(setR).catch(() => setR(null)) }, [id])

  const valid = r?.found && (r.status === 'valid' || r.status === 'accepted' || r.status === 'issued')
  return (
    <>
      <Navbar />
      <div className="dashboard-container ip-page">
        <h1 style={{ margin: '8px 0 14px' }}>Document verification</h1>
        {r === undefined ? <div className="ip-skel" /> : !r || !r.found ? (
          <section className="ip-card vd-card bad">
            <div className="vd-icon">✕</div>
            <strong>No DateU document with this ID</strong>
            <p className="ip-fine">Check the link or QR code. If you think this is a mistake, write to hello@dateu.in.</p>
          </section>
        ) : (
          <section className={`ip-card vd-card ${valid ? 'ok' : 'bad'}`}>
            <div className="vd-icon">{valid ? '✓' : '!'}</div>
            <strong>{valid ? 'Genuine document issued by DateU' : r.status === 'replaced' ? 'This copy has been replaced by a newer one' : 'This document has been withdrawn'}</strong>
            <dl className="idp-dl">
              <div><dt>Document</dt><dd>{TITLE[r.type]}</dd></div>
              <div><dt>Reference</dt><dd>{r.refNo}</dd></div>
              <div><dt>Issued to</dt><dd>{r.name}</dd></div>
              <div><dt>Role</dt><dd>{r.role}</dd></div>
              <div><dt>Intern ID</dt><dd>{r.internNo}</dd></div>
              <div><dt>{r.type === 'offer' ? 'Internship period' : 'Period'}</dt><dd>{fmt(r.startAt)} – {fmt(r.endAt)}</dd></div>
              <div><dt>Issued on</dt><dd>{fmt(r.issuedAt)}</dd></div>
              {r.type === 'offer' && <div><dt>Offer</dt><dd>{r.status === 'accepted' ? 'Accepted' : r.status === 'issued' ? 'Not yet accepted' : '—'}</dd></div>}
            </dl>
          </section>
        )}
      </div>
    </>
  )
}
