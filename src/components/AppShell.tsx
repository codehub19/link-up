import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isDesktopDevice, isStandalone } from '../utils/pwa'
import { InstallSheet, OfflineBanner } from './AppExtras'
import MobileNavbar from './MobileNavbar'
import { useAuth } from '../state/AuthContext'
import './AppShell.css'

// The logged-in app is built for phones and tablets. The website (home, pricing,
// legal pages) and the admin panel stay available on desktop.
const APP_PREFIXES = ['/dashboard', '/setup', '/pay', '/profile']

const ADMIN_PREVIEW_KEY = 'dateu.adminDesktopPreview'
function adminPreviewOn() {
  try { return sessionStorage.getItem(ADMIN_PREVIEW_KEY) === '1' } catch { return false }
}

const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content'
// Inside the app: no pinch/double-tap zoom, like a native app
const VIEWPORT_APP = VIEWPORT_DEFAULT + ', maximum-scale=1, user-scalable=no'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, profile, loading } = useAuth()
  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const [isDesktop] = useState(isDesktopDevice)
  const [adminPreview, setAdminPreview] = useState(adminPreviewOn)
  const standalone = isStandalone()

  // Global "app mode" styling (compact bars, no rubber-band scroll, safe areas)
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('app-mode', isAppRoute)
    root.classList.toggle('standalone', standalone)
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', isAppRoute ? VIEWPORT_APP : VIEWPORT_DEFAULT)
    return () => root.classList.remove('app-mode')
  }, [isAppRoute, standalone])

  // The app is phone/tablet only. Admins can opt in to a preview for this tab
  // (to test and support users) but still see the gate first.
  if (isAppRoute && isDesktop && !(profile?.isAdmin && adminPreview)) {
    return (
      <DesktopGate
        onAdminPreview={profile?.isAdmin ? () => {
          try { sessionStorage.setItem(ADMIN_PREVIEW_KEY, '1') } catch { }
          setAdminPreview(true)
        } : undefined}
      />
    )
  }

  // Opened from the home-screen icon: skip the marketing website
  if (standalone && pathname === '/' && !loading) {
    if (user) return <Navigate to="/dashboard" replace />
    return <AppWelcome />
  }

  return (
    <>
      {children}
      {/* Rendered outside the page transition so it stays still while screens slide */}
      <MobileNavbar />
      {isAppRoute && <OfflineBanner />}
      {isAppRoute && user && !isDesktop && <InstallSheet />}
    </>
  )
}

/** First screen of the installed app for signed-out users (instead of the website). */
function AppWelcome() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <div className="app-welcome">
      <div className="app-welcome-top">
        <div className="app-welcome-logo">DateU</div>
        <p>Meet people from your campus through curated rounds, voice calls and real conversations.</p>
      </div>
      <div className="app-welcome-bottom">
        <button
          className="app-welcome-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const isNew = await login()
              nav(isNew ? '/setup/profile' : '/dashboard', { replace: true })
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        <p className="app-welcome-legal">
          By continuing you agree to our <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}

function DesktopGate({ onAdminPreview }: { onAdminPreview?: () => void }) {
  const url = typeof window !== 'undefined' ? window.location.host || 'dateu.in' : 'dateu.in'
  return (
    <div className="desktop-gate">
      <div className="desktop-gate-card">
        <div className="desktop-gate-phone" aria-hidden="true">
          <div className="desktop-gate-notch" />
          <div className="desktop-gate-screen">
            <span className="desktop-gate-logo">DateU</span>
            <span className="desktop-gate-heart">💞</span>
          </div>
        </div>
        <div>
          <h1>DateU lives on your phone</h1>
          <p>
            The DateU app is designed for phones and tablets — rounds, calls and chat all work best in your hand.
          </p>
          <ol>
            <li>Open <strong>{url}</strong> on your phone or tablet</li>
            <li>Sign in with the same Google account</li>
            <li>Tap <strong>Add to Home Screen</strong> (Share menu on iPhone, ⋮ menu on Android) to use it like an app</li>
          </ol>
          <div className="desktop-gate-actions">
            <a className="desktop-gate-link" href="/">← Back to dateu.in</a>
            {onAdminPreview && (
              <button type="button" className="desktop-gate-admin" onClick={onAdminPreview}>
                Admin: preview on desktop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
