import React from 'react'

export type ProfileCardData = {
  photoUrl?: string
  bio?: string
  interests?: string[]
}

export default function ProfileCard({
  data,
  footer,
}: {
  data: ProfileCardData
  footer?: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="card-media">
        {data.photoUrl ? <img src={data.photoUrl} alt="profile" /> : <div className="media-placeholder" />}
      </div>
      <div className="card-body">
        <p className="bio">{data.bio}</p>
        <div className="tags">
          {(data.interests ?? []).map((i) => (
            <span key={i} className="tag">{i}</span>
          ))}
        </div>
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}