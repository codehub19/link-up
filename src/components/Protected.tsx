import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { nextSetupRoute } from '../firebase'

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
  if (!user) return <Navigate to="/" state={{ from: loc }} replace />

  if (requireProfile && !profile?.isProfileComplete) {
    const next = nextSetupRoute(profile) || '/setup/profile'
    return <Navigate to={next} replace />
  }

  return <>{children}</>
}