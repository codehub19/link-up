import React from 'react'
import { photoOf } from '../utils/avatar'

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
        <img src={photoOf(data as any)} alt="profile" />
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