import { Link, useLocation } from 'react-router-dom'
import React from 'react'

export default function FemaleTabs() {
  const loc = useLocation()
  const is = (p: string) => loc.pathname.startsWith(p)

  return (
    <div className="row" style={{ gap: 8, marginBottom: 16 }}>


      <Link className={`tab-btn${is('/dashboard/matches') ? ' tab-btn-active' : ''}`} to="/dashboard/connections">
        <span className="tab-btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF1493" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-hidden="true">
            <title>Matches</title>
            <g transform="translate(-1.6 0)" strokeOpacity="0.45">
              <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z"/>
            </g>
            <g transform="translate(1.6 0)">
              <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z"/>
            </g>
          </svg>
        </span>
        <span className="tab-btn-label">Matches</span>
      </Link>
      <Link className={`tab-btn${is('/dashboard/edit-profile') ? ' tab-btn-active' : ''}`} to="/dashboard/female/edit-profile">
        <span className="tab-btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6ca0dc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-hidden="true">
          <title>User Profile</title>
          <circle cx="12" cy="7" r="4"/>
          <path d="M6 21v-2a6 6 0 0 1 12 0v2"/>
          <path d="M4 19c4-3 12-3 16 0" stroke-opacity="0.3"/>
          </svg>
        </span>
        <span className="tab-btn-label">Profile</span>
      </Link>
    </div>
  )
}