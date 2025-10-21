import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import InstallPWAButton from './InstallPWAButton'
import React, { useState, useEffect } from 'react'

// Bell icon SVG as a component
function BellIcon({ size = 24, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22c1.104 0 2-.896 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.309-2.691-6-6-6S6 7.691 6 11v5l-2 2v1h16v-1l-2-2zM18 17H6v-.382l1.447-1.447C7.791 14.463 8 13.748 8 13V11c0-2.209 1.791-4 4-4s4 1.791 4 4v2c0 .748.209 1.463.553 2.171L18 16.618V17z"
        fill={color}
      />
    </svg>
  );
}

// Dashboard icon SVG as a component
function DashboardIcon({ size = 22, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={color}/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill={color}/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill={color}/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill={color}/>
    </svg>
  )
}

export default function Navbar() {
  const { user, profile, login } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const [hasUnread, setHasUnread] = useState(false)

  const isActive = (p: string) => loc.pathname === p || loc.pathname.startsWith(p)
  const profilePath = profile?.gender === 'male' ? '/dashboard' : '/dashboard/'

  // Listen for new notification events to show badge
  useEffect(() => {
    const handler = () => setHasUnread(true)
    window.addEventListener('new-notification', handler)
    return () => window.removeEventListener('new-notification', handler)
  }, [])

  // Clear badge when visiting notifications page
  useEffect(() => {
    if (loc.pathname === '/dashboard/notifications') setHasUnread(false)
  }, [loc.pathname])

  return (
    <nav className="nav">
      <div className="container">
        <div className="nav-left">
          <Link to="/" className="logo">DateU</Link>
        </div>
        <div className="nav-right">
          {user && profile?.isProfileComplete && (
            <>
              <Link
                to={profilePath}
                className={`nav-link icon-btn ${isActive(profilePath) ? 'active' : ''}`}
                title="Dashboard"
                style={{ display: "inline-flex", alignItems: "center", marginRight: 8 }}
              >
                <DashboardIcon size={24} color="#ff5d7c" />
              </Link>
              {/* Notifications Bell */}
              <div
                style={{
                  position: "relative",
                  marginLeft: 18,
                  cursor: "pointer",
                  display: "inline-block"
                }}
                onClick={() => {
                  setHasUnread(false)
                  navigate('/dashboard/notifications')
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <BellIcon size={28} color="#ff5d7c" />
                {hasUnread && (
                  <span style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 10,
                    height: 10,
                    background: "#ff5d7c",
                    borderRadius: "50%",
                    border: "2px solid #232a38"
                  }} />
                )}
              </div>
            </>
          )}
          <InstallPWAButton className="btn btn-ghost" label="Install App" />
          <div className="row" style={{ marginLeft: 4 }}>
            {user && profile?.isProfileComplete ? null : user ? (
              <Link to="/setup/gender" className="btn btn-primary">Complete Profile</Link>
            ) : (
              <button className="btn btn-primary" onClick={login}>Login with Google</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}