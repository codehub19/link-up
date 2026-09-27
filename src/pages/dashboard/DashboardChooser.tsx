import { Navigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { NEXT_KEY } from '../../components/home/JoinButton'
import { useEffect, useState } from 'react'

export default function DashboardChooser() {
  const { user, profile, loading } = useAuth()
  const [dest, setDest] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (loading) return

      // Safety checks
      if (!profile?.gender) {
        return setDest('/setup/gender')
      }
      if (!profile.isProfileComplete) {
        return setDest('/setup/profile')
      }

      // Came from a shared link (e.g. an event) before signing up
      try {
        const next = sessionStorage.getItem(NEXT_KEY)
        if (next && next.startsWith('/dashboard/')) { sessionStorage.removeItem(NEXT_KEY); return setDest(next) }
      } catch { }

      // DateU is about making friends: everyone starts in Friends
      setDest('/dashboard/friends')
    }
    run()
  }, [user?.uid, profile?.gender, profile?.isProfileComplete, loading])

  if (loading || dest === null) return null
  return <Navigate to={dest} replace />
}