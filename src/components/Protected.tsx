import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function Protected({
  children,
  requireProfile = true,
}: {
  children: React.ReactNode
  requireProfile?: boolean
}) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null

  if (!user) {
    return <Navigate to="/" state={{ from: loc }} replace />
  }

  if (requireProfile && !profile?.isProfileComplete) {
    // Redirect to onboarding
    if (!profile?.gender) return <Navigate to="/setup/gender" replace />
    return <Navigate to="/setup/profile" replace />
  }

  return <>{children}</>
}