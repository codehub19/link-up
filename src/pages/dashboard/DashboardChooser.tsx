import { Navigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { useEffect, useState } from 'react'
import { getMaleEntitlement } from '../../services/entitlements'

export default function DashboardChooser() {
  const { user, profile, loading } = useAuth()
  const [dest, setDest] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (loading) return
      if (!profile?.gender) return setDest('/setup/gender')
      if (!profile.isProfileComplete) return setDest('/setup/profile')

      if (profile.gender === 'male') {
        if (!user) return setDest('/setup/gender')
        const ent = await getMaleEntitlement(user.uid)
        if (ent.hasActiveSubscription) return setDest('/dashboard/matches')
        return setDest('/dashboard/plans')
      } else {
        return setDest('/dashboard/round')
      }
    }
    run()
  }, [user, profile, loading])

  if (loading || dest === null) return null
  return <Navigate to={dest} replace />
}