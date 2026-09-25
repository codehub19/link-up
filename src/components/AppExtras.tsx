import { useEffect, useState } from 'react'
import { getInstallPrompt, isIOS, isStandalone, onInstallPromptChange, promptInstall } from '../utils/pwa'

const INSTALL_DISMISS_KEY = 'dateu.installSheetDismissedAt'
const INSTALL_DISMISS_MS = 7 * 24 * 3600 * 1000
const INSTALL_DELAY_MS = 15_000

function dismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0) < INSTALL_DISMISS_MS } catch { return false }
}

/** "You're offline" pill, like native apps show when the connection drops. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return <div className="app-offline" role="status">You're offline — we'll reconnect automatically</div>
}

/** Bottom sheet inviting browser users to install DateU on their home screen. */
export function InstallSheet() {
  const [open, setOpen] = useState(false)
  const [canPrompt, setCanPrompt] = useState(!!getInstallPrompt())
  const ios = isIOS()

  useEffect(() => onInstallPromptChange(() => setCanPrompt(!!getInstallPrompt())), [])

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return
    const t = setTimeout(() => setOpen(true), INSTALL_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // Nothing we can offer on this browser (e.g. desktop Firefox)
  if (!open || (!canPrompt && !ios)) return null

  const close = () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())) } catch { /* private mode */ }
    setOpen(false)
  }

  return (
    <div className="app-sheet-backdrop" onClick={close}>
      <div className="app-sheet" role="dialog" aria-label="Install DateU" onClick={(e) => e.stopPropagation()}>
        <div className="app-sheet-handle" />
        <img className="app-sheet-icon" src="/icons/icon-192.png" alt="" />
        <h3>Get the DateU app</h3>
        <p>Full screen, faster, and you'll never miss a match, call or message.</p>
        {ios ? (
          <ol className="app-sheet-steps">
            <li>Tap the <strong>Share</strong> button <span aria-hidden="true">⬆︎</span> in Safari</li>
            <li>Choose <strong>Add to Home Screen</strong></li>
            <li>Open DateU from your home screen</li>
          </ol>
        ) : (
          <button className="app-sheet-primary" onClick={async () => { await promptInstall(); close() }}>Install app</button>
        )}
        <button className="app-sheet-secondary" onClick={close}>Not now</button>
      </div>
    </div>
  )
}
