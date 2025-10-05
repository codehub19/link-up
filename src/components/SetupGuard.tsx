import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.isProfileComplete) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}