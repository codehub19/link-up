import { Navigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'

export default function DashboardChooser() {
  const { profile } = useAuth()
  if (!profile?.gender) return <Navigate to="/setup/gender" replace />
  if (!profile.isProfileComplete) return <Navigate to="/setup/profile" replace />
  return profile.gender === 'male' ? <Navigate to="/dashboard/plans" replace /> : <Navigate to="/dashboard/round" replace />
}