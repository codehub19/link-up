import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function Navbar() {
  const { user, profile, logout, login } = useAuth()
  const loc = useLocation()

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="logo">LinkUp</Link>
        <Link to="/#how" className="nav-link">How it Works</Link>
      </div>
      <div className="nav-right">
        {user && profile?.isProfileComplete ? (
          <>
            <Link to="/dashboard" className="btn ghost">Dashboard</Link>
            <button className="btn" onClick={logout}>Logout</button>
          </>
        ) : user ? (
          <Link to="/setup/gender" className="btn">Complete Profile</Link>
        ) : (
          <button className="btn" onClick={login}>Login with Google</button>
        )}
      </div>
    </nav>
  )
}