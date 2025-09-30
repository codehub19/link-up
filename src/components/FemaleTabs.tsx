import { Link, useLocation } from 'react-router-dom'
import React from 'react'

export default function FemaleTabs() {
  const loc = useLocation()
  const is = (p: string) => loc.pathname.startsWith(p)

  return (
    <div className="row" style={{ gap: 8, marginBottom: 16 }}>
      <Link className={`btn ${is('/dashboard/connections') ? 'primary' : 'ghost'}`} to="/dashboard/connections">
        Matches
      </Link>
      <Link className={`btn ${is('/dashboard/female/edit-profile') ? 'primary' : 'ghost'}`} to="/dashboard/female/edit-profile">
        Edit Profile
      </Link>
    </div>
  )
}