import React, { useState, useEffect, useCallback } from 'react'

export default function ProfileMiniCard({
  photoUrl,
  name,
  instagramId,
  bio,
  interests,
  college,
  age,
  footer,
}: {
  photoUrl?: string
  name?: string
  instagramId?: string
  bio?: string
  interests?: string[]
  college?: string
  age?: number
  footer?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onKey])

  return (
    <>
      <div className="mini-card">
        <button
          type="button"
          className="mini-media"
          onClick={() => photoUrl && setOpen(true)}
          aria-label="Open photo"
        >
          {photoUrl ? (
            <>
              <div
                className="mini-media-bg"
                style={{ backgroundImage: `url(${photoUrl})` }}
                aria-hidden
              />
              <img className="mini-media-img" src={photoUrl} alt={name || 'profile'} />
            </>
          ) : (
            <div className="mini-placeholder" />
          )}
        </button>

        <div className="mini-body">
          <div className="mini-title">
            <strong className="ellipsis">{name ?? 'Student'}</strong>
            {instagramId ? <span className="muted">@{instagramId}</span> : null}
          </div>

          {(college || typeof age === 'number') ? (
            <div className="mini-meta-lines">
              {college ? <div className="mini-college">{college}</div> : null}
              {typeof age === 'number' ? <div className="mini-age">{age} y/o</div> : null}
            </div>
          ) : null}

          {bio ? <p className="mini-bio ellipsis-2">{bio}</p> : null}

          {interests?.length ? (
            <div className="mini-tags">
              {interests.slice(0, 3).map((t) => (
                <span key={t} className="mini-tag">{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        {footer ? <div className="mini-footer">{footer}</div> : null}
      </div>

      {/* Popup Lightbox with close button (Esc and click outside supported) */}
      {open && photoUrl ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full photo"
          onClick={() => setOpen(false)}
        >
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={photoUrl} alt={name || 'profile'} />
            <button
              className="lightbox-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}