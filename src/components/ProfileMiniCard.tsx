import React from 'react'

export default function ProfileMiniCard({
  photoUrl,
  name,
  instagramId,
  bio,
  interests,
  footer,
}: {
  photoUrl?: string
  name?: string
  instagramId?: string
  bio?: string
  interests?: string[]
  footer?: React.ReactNode
}) {
  return (
    <div className="mini-card">
      <div className="mini-media">
        {photoUrl ? <img src={photoUrl} alt={name || 'profile'} /> : <div className="mini-placeholder" />}
      </div>
      <div className="mini-body">
        <div className="mini-title">
          <strong className="ellipsis">{name ?? 'Student'}</strong>
          {instagramId ? <span className="muted">@{instagramId}</span> : null}
        </div>
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
  )
}