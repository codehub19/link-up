import React from 'react'
import { captureError } from '../utils/analytics'

type State = { error: Error | null }

/** Last line of defence: a friendly screen (and a crash report) instead of a blank page. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack?.slice(0, 2000) })
    // A new version was deployed and an old chunk is gone: reload once to get the new one
    if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message)) {
      try {
        if (!sessionStorage.getItem('dateu.chunkReload')) {
          sessionStorage.setItem('dateu.chunkReload', '1')
          window.location.reload()
        }
      } catch { /* ignore */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b0b10', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😵‍💫</div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#a6a7bb', margin: '0 0 20px', lineHeight: 1.5 }}>Sorry about that — we’ve been told about it. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => { try { sessionStorage.removeItem('dateu.chunkReload') } catch { /* ignore */ } window.location.href = '/dashboard' }}
            style={{ border: 'none', borderRadius: 999, padding: '12px 24px', fontWeight: 700, fontSize: 15, color: '#fff', background: 'linear-gradient(135deg,#ff416c,#ff4b2b)', cursor: 'pointer' }}
          >
            Reload DateU
          </button>
        </div>
      </div>
    )
  }
}
