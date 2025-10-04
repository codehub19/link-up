import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import InstallPWAButton from './InstallPWAButton'

export default function Navbar() {
  const { user, profile, logout, login } = useAuth()
  const loc = useLocation()

  const isActive = (p: string) => loc.pathname === p || loc.pathname.startsWith(p)

  
  const profilePath = profile?.gender === 'male' ? '/dashboard' : '/dashboard/'

  return (
    <nav className="nav">
      <div className="container">
        <div className="nav-left">
          <Link to="/" className="logo">DateU</Link>
        </div>
        <div className="nav-right">

          {user && profile?.isProfileComplete && (
            <>
              <Link to={profilePath} className={`nav-link ${isActive(profilePath) ? 'active' : ''}`}>Dashboard</Link>
            </>
          )}
           <InstallPWAButton className="btn btn-ghost" label="Install App" />
          <div className="row" style={{ marginLeft: 4 }}>
            {user && profile?.isProfileComplete ? (
              <button className="btn btn-ghost" onClick={logout}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" role="img">
                    <title>Logout</title>
                    <path d="M10 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h4v-2H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4V3z" fill="currentColor"/>
                    <path d="M21 12l-4-4v3h-7v2h7v3l4-4z" fill="currentColor"/>
                  </svg>
              </button>
            ) : user ? (
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