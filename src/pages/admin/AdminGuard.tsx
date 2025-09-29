import React from 'react'
import { useAuth } from '../../state/AuthContext'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return null

  // treat isAdmin as unknown schema, fallback to false if missing
  const isAdmin = Boolean((profile as any)?.isAdmin)

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 800 }}>
          Please sign in to access the admin area.
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 800 }}>
          You are not authorized to view this page.
        </div>
      </div>
    )
  }

  return <>{children}</>
}