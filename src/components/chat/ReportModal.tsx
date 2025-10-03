import React, { useState } from 'react'

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
  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-header">
          <div className="modal-title">
            <div className="name">Report user</div>
            <div className="sub">Tell us briefly what happened</div>
          </div>
        </div>
        <div className="modal-body">
          <textarea
            className="textarea"
            placeholder="Reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn danger" disabled={!reason.trim()} onClick={async () => { await onSubmit(reason.trim()); onClose(); }}>
              Submit report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}