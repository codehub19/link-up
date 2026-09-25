import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../state/AuthContext'
import type { AppConfig } from '../services/adminTools'
import './AppStatus.css'

function readDismissed(): string | null {
  try { return localStorage.getItem('dateu.dismissedAnnouncement') } catch { return null }
}

/**
 * App-wide switches controlled from Admin → App controls:
 * maintenance screen, paused sign-ups notice and the announcement banner.
 * Renders `children` normally when nothing applies.
 */
export default function AppStatus({ children }: { children: React.ReactNode }) {
  const { user, profile, logout } = useAuth()
  const loc = useLocation()
  const [cfg, setCfg] = useState<AppConfig>({})
  const [dismissed, setDismissed] = useState<string | null>(readDismissed)

  useEffect(() => onSnapshot(doc(db, 'config', 'app'), (s) => setCfg((s.data() as AppConfig) || {}), () => setCfg({})), [])

  const isAdminArea = loc.pathname.startsWith('/admin')
  const isAdmin = !!profile?.isAdmin

  if (cfg.maintenanceMode && !isAdmin && !isAdminArea) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <div className="app-status-emoji">🛠️</div>
          <h1>We'll be right back</h1>
          <p>{cfg.maintenanceMessage || "DateU is getting an upgrade. Please check back in a few minutes."}</p>
        </div>
      </div>
    )
  }

  // Signed in, but the profile couldn't be created because sign-ups are paused
  if (cfg.signupsPaused && user && !profile && !isAdminArea) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <div className="app-status-emoji">⏸️</div>
          <h1>New sign-ups are paused</h1>
          <p>We're not accepting new accounts right now. Please try again soon!</p>
          <button className="app-status-btn" onClick={() => logout()}>Sign out</button>
        </div>
      </div>
    )
  }

  const ann = cfg.announcement
  const showBanner = !!ann?.active && !!ann.text && dismissed !== ann.text && !isAdminArea

  return (
    <>
      {children}
      {showBanner && (
        <div className={`app-announcement tone-${ann!.tone || 'info'}`} role="status">
          <span className="app-announcement-text">
            {ann!.link
              ? (ann!.link.startsWith('/') ? <Link to={ann!.link}>{ann!.text}</Link> : <a href={ann!.link} target="_blank" rel="noreferrer">{ann!.text}</a>)
              : ann!.text}
          </span>
          <button
            aria-label="Dismiss"
            onClick={() => {
              try { localStorage.setItem('dateu.dismissedAnnouncement', ann!.text!) } catch { /* private mode */ }
              setDismissed(ann!.text!)
            }}
          >✕</button>
        </div>
      )}
    </>
  )
}
