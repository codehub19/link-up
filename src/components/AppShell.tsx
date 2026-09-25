import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import './AppShell.css'

// The logged-in app is built for phones and tablets. The website (home, pricing,
// legal pages) and the admin panel stay available on desktop.
const APP_PREFIXES = ['/dashboard', '/setup', '/pay', '/profile']

// Desktop = wide screen with a mouse. iPads (touch) and phones are allowed.
const DESKTOP_QUERY = '(min-width: 1025px) and (hover: hover) and (pointer: fine)'

function useMediaQuery(q: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mql = window.matchMedia(q)
    const on = () => setMatches(mql.matches)
    on()
    mql.addEventListener?.('change', on)
    return () => mql.removeEventListener?.('change', on)
  }, [q])
  return matches
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // Global "app mode" styling (compact bars, no rubber-band scroll, safe areas)
  useEffect(() => {
    document.documentElement.classList.toggle('app-mode', isAppRoute)
    return () => document.documentElement.classList.remove('app-mode')
  }, [isAppRoute])

  // Admins can still use the app on desktop to test and support users
  if (isAppRoute && isDesktop && !profile?.isAdmin) return <DesktopGate />
  return <>{children}</>
}

function DesktopGate() {
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
          <a className="desktop-gate-link" href="/">← Back to dateu.in</a>
        </div>
      </div>
    </div>
  )
}
