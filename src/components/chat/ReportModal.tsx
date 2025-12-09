import React, { useState } from 'react'

const REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Inappropriate content",
  "Fake profile",
  "Other"
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

  if (!open) return null

  const handleSubmit = async () => {
    const finalReason = reason === 'Other' ? customReason : reason
    if (!finalReason.trim()) return
    await onSubmit(finalReason.trim())
    onClose()
    setReason('')
    setCustomReason('')
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card report-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-header">
          <div className="modal-title">
            <div className="name">Report User</div>
            <div className="sub">Please select a reason for reporting</div>
          </div>
        </div>
        <div className="modal-body">
          <div className="report-options">
            {REASONS.map(r => (
              <label key={r} className={`report-option ${reason === r ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <textarea
              className="textarea"
              placeholder="Please describe the issue..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{ marginTop: 12, minHeight: 80 }}
            />
          )}

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn danger"
              disabled={!reason || (reason === 'Other' && !customReason.trim())}
              onClick={handleSubmit}
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .report-modal {
          max-width: 400px;
        }
        .report-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .report-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          background: #181821;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s;
        }
        .report-option:hover {
          background: #20202a;
        }
        .report-option.selected {
          border-color: #ff416c;
          background: rgba(255, 65, 108, 0.05);
        }
        .report-option input {
          accent-color: #ff416c;
        }
      `}</style>
    </div>
  )
}