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
  collegeId,
}: {
  photoUrl?: string
  name?: string
  instagramId?: string
  bio?: string
  interests?: string[]
  college?: string
  age?: number
  footer?: React.ReactNode
  collegeId?: { verified?: boolean }
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
            {collegeId?.verified && (
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