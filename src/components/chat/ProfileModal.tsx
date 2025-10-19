import React, { useEffect, useRef } from 'react'
import LoadingSpinner from '../LoadingSpinner';

export default function ProfileModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user?: { name?: string; instagramId?: string; photoUrl?: string; bio?: string; interests?: string[]; college?: string; collegeId?: { verified?: boolean } }
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  if (!user) return <LoadingSpinner />;
  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Close when clicking the dimmed overlay (not when clicking inside the card)
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="modal-card" role="document">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-header">
          <div className="avatar lg">
            {user?.photoUrl ? <img src={user.photoUrl} alt={user?.name || 'user'} /> : <div className="avatar-fallback">{(user?.name || 'U').slice(0,1)}</div>}
          </div>
          <div className="modal-title">
            <div className="name">
              {user?.name || 'User'}
              {user?.collegeId?.verified && (
                <span title="Verified" style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <defs>
                    <linearGradient id="insta-gradient" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f9ce34"/>
                      <stop offset="0.5" stopColor="#ee2a7b"/>
                      <stop offset="1" stopColor="#6228d7"/>
                    </linearGradient>
                  </defs>
                  <circle cx="11" cy="11" r="10" fill="url(#insta-gradient)" />
                  <path
                    d="M7.7 11.8l2.1 2.1 4.1-4.1"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="11" cy="11" r="9.2" stroke="#fff" strokeWidth="1.2" fill="none"/>
                </svg>
              </span>
              )}
            </div>
            <div className="sub">@{user?.instagramId || '—'}</div>
          </div>
        </div>
        <div className="modal-body">
          {user?.college ? <div className="row"><strong>College:</strong>&nbsp;<span>{user.college}</span></div> : null}
          {user?.bio ? <p className="bio">{user.bio}</p> : null}
          {user?.interests?.length ? (
            <div className="tags">
              {user.interests.map((i) => <span className="tag" key={i}>{i}</span>)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}