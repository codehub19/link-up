import React, { useEffect, useRef } from 'react'

export default function ProfileModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user?: { name?: string; instagramId?: string; photoUrl?: string; bio?: string; interests?: string[]; college?: string }
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="modal-card" role="document">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-header">
          <div className="avatar lg">
            {user?.photoUrl ? <img src={user.photoUrl} alt={user?.name || 'user'} /> : <div className="avatar-fallback">{(user?.name || 'U').slice(0,1)}</div>}
          </div>
          <div className="modal-title">
            <div className="name">{user?.name || 'User'}</div>
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