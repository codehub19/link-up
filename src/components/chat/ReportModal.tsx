import { useState } from 'react'
import '../../styles/chat.css'

const REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Inappropriate content',
  'Fake profile',
  'Other',
]

export default function ReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => Promise<void> | void
}) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const close = () => {
    setReason('')
    setCustomReason('')
    setDone(false)
    onClose()
  }

  const handleSubmit = async () => {
    const finalReason = (reason === 'Other' ? customReason : reason).trim()
    if (!finalReason) return
    setBusy(true)
    try {
      await onSubmit(finalReason)
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dm dm-modal" role="dialog" aria-modal="true" aria-label="Report" onClick={close}>
      <div className="dm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dm-sheet-handle" />
        <button type="button" className="dm-modal-close" onClick={close} aria-label="Close">✕</button>
        {done ? (
          <>
            <div className="dm-modal-title">Thanks for letting us know</div>
            <p className="dm-modal-desc">Our team reviews every report, usually within 24 hours. Your report is confidential.</p>
            <div className="dm-modal-actions">
              <button type="button" className="dm-pill-btn" onClick={close}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="dm-modal-title">Report</div>
            <p className="dm-modal-desc">Why are you reporting this person? They won’t know it was you.</p>
            <div className="dm-report-options">
              {REASONS.map((r) => (
                <label key={r} className={`dm-report-option ${reason === r ? 'selected' : ''}`}>
                  <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            {reason === 'Other' && (
              <textarea
                placeholder="Tell us what happened…"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                autoFocus
              />
            )}
            <div className="dm-modal-actions" style={{ marginTop: 18 }}>
              <button type="button" className="dm-pill-btn ghost" onClick={close}>Cancel</button>
              <button
                type="button"
                className="dm-pill-btn danger"
                disabled={busy || !reason || (reason === 'Other' && !customReason.trim())}
                onClick={handleSubmit}
              >
                {busy ? 'Sending…' : 'Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
