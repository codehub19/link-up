import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

/**
 * Blocks access to setup pages after profile setup is complete.
 * If the profile is complete, redirects the user to /dashboard.
 */
export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null

  if (profile?.isProfileComplete) {
    // Prevent navigating back to setup via history
    return <Navigate to="/dashboard" state={{ from: loc }} replace />
  }

  return <>{children}</>
}