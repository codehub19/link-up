import { Link, useLocation } from 'react-router-dom'

export default function MaleTabs() {
  const loc = useLocation()
  const is = (p: string) => loc.pathname.startsWith(p)

  return (
    <div className="row" style={{ gap: 8, marginBottom: 16 }}>
      <Link className={`btn ${is('/dashboard/plans') ? 'primary' : 'ghost'}`} to="/dashboard/plans">Purchase</Link>
      <Link className={`btn ${is('/dashboard/matches') ? 'primary' : 'ghost'}`} to="/dashboard/matches">Matches</Link>
      <Link className={`btn ${is('/dashboard/edit-profile') ? 'primary' : 'ghost'}`} to="/dashboard/edit-profile">Edit Profile</Link>
    </div>
  )
}