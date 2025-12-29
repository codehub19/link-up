import { Navigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { useEffect, useState } from 'react'
import { getMaleEntitlement } from '../../services/entitlements'

export default function DashboardChooser() {
  const { user, profile, loading } = useAuth()
  const [dest, setDest] = useState<string | null>(null)

  useEffect(() => {
    // console.log('DashboardChooser effect running', { loading, gender: profile?.gender, completed: profile?.isProfileComplete, uid: user?.uid })
    const run = async () => {
      if (loading) return

      // Safety checks
      if (!profile?.gender) {
        // console.log('Redirecting to gender setup from DashboardChooser')
        return setDest('/setup/gender')
      }
      if (!profile.isProfileComplete) {
        // console.log('Redirecting to profile setup from DashboardChooser')
        return setDest('/setup/profile')
      }

      if (profile.gender === 'male') {
        if (!user) return setDest('/setup/gender')
        const ent = await getMaleEntitlement(user.uid)
        if (ent.hasActiveSubscription) return setDest('/dashboard/matches')
        return setDest('/dashboard/plans')
      } else if (profile.gender === 'female') {
        // console.log('Redirecting to female round')
        return setDest('/dashboard/round')
      } else {
        // Fallback for invalid gender - maybe send to edit profile or setup
        return setDest('/setup/gender')
      }
    }
    run()
  }, [user?.uid, profile?.gender, profile?.isProfileComplete, loading])

  if (loading || dest === null) return null
  return <Navigate to={dest} replace />
}