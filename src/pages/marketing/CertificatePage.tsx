import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '../../firebase'
import LoadingHeart from '../../components/LoadingHeart'
import { useSeo } from '../../utils/seo'
import { qrDataUrl } from '../intern/promo'
import { useDocFonts } from '../intern/docFonts'
import './CertificatePage.css'

type Cert = {
  id: string; name: string; role: string; department?: string; track?: string; refNo?: string
  startDate: string; endDate: string; issueDate: string
  signatoryName?: string | null; signatoryTitle?: string; signatureUrl?: string | null; companyName?: string
}

const W = 1122, H = 793 // A4 landscape at 96 dpi
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

/** Public certificate of completion (/certificate/:id). */
export default function CertificatePage() {
  useSeo({ title: 'Certificate', noindex: true })
  useDocFonts()
  const { id = '' } = useParams()
  const [cert, setCert] = useState<Cert | null | undefined>(undefined)
  const [qr, setQr] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDoc(doc(db, 'certificates', id))
      .then((s) => setCert(s.exists() ? ({ id: s.id, ...(s.data() as any) }) : null))
      .catch(() => setCert(null))
  }, [id])
  const verifyUrl = `https://dateu.in/verify/${id}`
  useEffect(() => { if (cert?.refNo) qrDataUrl(verifyUrl).then(setQr).catch(() => { }) }, [cert?.refNo, verifyUrl])
  useEffect(() => {
    if (!cert) return
    const prev = document.title
    document.title = `Certificate of Completion - ${cert.name}`
    return () => { document.title = prev }
  }, [cert])

  // Fit the A4 certificate to the screen width
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / W))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cert])

  if (cert === undefined) return <div className="cp-center"><LoadingHeart /></div>
  if (cert === null) return <div className="cp-center">Certificate not found.</div>

  const company = cert.companyName || 'DateU'
  const year = new Date(cert.issueDate).getFullYear()
  const copy = async () => { await navigator.clipboard.writeText(verifyUrl).catch(() => { }); toast.success('Verification link copied') }

  return (
    <div className="cp-page">
      <div className="cp-toolbar no-print">
        <button className="cp-btn" onClick={() => window.print()}>⬇ Download PDF</button>
        {cert.refNo && <button className="cp-btn ghost" onClick={copy}>Copy verification link</button>}
      </div>

      <div className="cp-fit" ref={boxRef} style={{ height: H * scale }}>
        <div className="cp-cert" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <div className="cp-frame" />
          <div className="cp-frame2" />
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => <span key={c} className={`cp-corner ${c}`} />)}

          <div className="cp-inner">
            <div className="cp-brand">
              <img src="/icons/icon-192.png" alt="" />
              <span>{company}</span>
            </div>

            <h1 className="cp-title">Certificate</h1>
            <div className="cp-sub"><span />of Completion<span /></div>

            <div className="cp-middle">
            <p className="cp-presented">This certificate is proudly presented to</p>
            <div className="cp-name">{cert.name}</div>

            <p className="cp-text">
              {cert.track ? (
                <>for successfully completing an internship as <b>{cert.role}</b>{cert.department ? <> with the <b>{cert.department}</b> team</> : null} at <b>{company}</b>, </>
              ) : (
                <>for successfully completing the <b>{cert.role}</b> internship programme at <b>{company}</b>, </>
              )}
              from <b>{fmt(cert.startDate)}</b> to <b>{fmt(cert.endDate)}</b>.
              {' '}We recognise their dedication, initiative and valuable contribution.
            </p>
            </div>

            <div className="cp-bottom">
              <div className="cp-sign">
                <div className="cp-sign-mark">
                  {cert.signatureUrl ? <img src={cert.signatureUrl} alt="" /> : <span>{cert.signatoryName || company}</span>}
                </div>
                <div className="cp-line" />
                <strong>{cert.signatoryName || 'Authorised signatory'}</strong>
                <small>{cert.signatoryTitle || `Founder, ${company}`}</small>
              </div>

              <div className="cp-seal" aria-hidden="true">
                <div className="cp-seal-ring">
                  <div className="cp-seal-core">
                    <small>{company}</small>
                    <strong>★</strong>
                    <small>Certified · {year}</small>
                  </div>
                </div>
              </div>

              <div className="cp-meta">
                {qr && <img src={qr} alt="" />}
                <div>
                  <span>Certificate No.</span>
                  <strong>{cert.refNo || cert.id.slice(0, 8).toUpperCase()}</strong>
                  <span>Issued on</span>
                  <strong>{fmt(cert.issueDate)}</strong>
                  {cert.refNo && <em>Verify at dateu.in/verify/{cert.id}</em>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
