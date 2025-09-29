import React from 'react'
import { useAuth } from '../../state/AuthContext'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  if (!user) return <div className="container"><div className="card" style={{padding:24, margin:'24px auto', maxWidth:800}}>Please log in.</div></div>
  if (!profile?.isAdmin) return <div className="container"><div className="card" style={{padding:24, margin:'24px auto', maxWidth:800}}>You are not authorized to view this page.</div></div>
  return <>{children}</>
}