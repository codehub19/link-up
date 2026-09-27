import { useEffect, useState } from 'react'
import { getInstallPrompt, isIOS, isStandalone, onInstallPromptChange, promptInstall } from '../utils/pwa'

const INSTALL_DISMISS_KEY = 'dateu.installSheetDismissedAt'
const INSTALL_DISMISS_MS = 3 * 24 * 3600 * 1000
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

const OPEN_EVENT = 'dateu:install'

/** Open the install sheet now (e.g. from a "Get the app" button). */
export function openInstallSheet() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/** Instagram, Facebook, Snapchat… open links in their own browser, which can't install apps. */
function inAppBrowser() {
  return /Instagram|FBAN|FBAV|FB_IAB|Snapchat|LinkedInApp|Line\/|; wv\)/i.test(navigator.userAgent)
}

/**
 * Bottom sheet inviting browser users to install DateU on their home screen.
 * Opens by itself after `delayMs` (unless dismissed recently), or any time via openInstallSheet().
 */
export function InstallSheet({ delayMs = INSTALL_DELAY_MS }: { delayMs?: number }) {
  const [open, setOpen] = useState(false)
  const [canPrompt, setCanPrompt] = useState(!!getInstallPrompt())
  const ios = isIOS()
  const android = /Android/i.test(navigator.userAgent)
  const inApp = inAppBrowser()

  useEffect(() => onInstallPromptChange(() => setCanPrompt(!!getInstallPrompt())), [])

  useEffect(() => {
    const show = () => { if (!isStandalone()) setOpen(true) }
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return
    const t = setTimeout(() => setOpen(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])

  // Nothing we can offer on this browser (e.g. desktop Firefox)
  if (!open || isStandalone() || (!canPrompt && !ios && !android && !inApp)) return null

  const close = () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())) } catch { /* private mode */ }
    setOpen(false)
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); alert('Link copied — paste it in Chrome or Safari') } catch { }
  }

  let body: JSX.Element
  if (inApp) {
    body = (
      <>
        <ol className="app-sheet-steps">
          <li>Tap <strong>⋮</strong> or <strong>…</strong> at the top of this screen</li>
          <li>Choose <strong>Open in browser</strong> ({ios ? 'Safari' : 'Chrome'})</li>
          <li>Then install DateU from there</li>
        </ol>
        <button className="app-sheet-primary" onClick={copyLink}>Copy link</button>
      </>
    )
  } else if (canPrompt) {
    body = <button className="app-sheet-primary" onClick={async () => { await promptInstall(); close() }}>Install app</button>
  } else if (ios) {
    body = (
      <ol className="app-sheet-steps">
        <li>Tap the <strong>Share</strong> button <span aria-hidden="true">⬆︎</span> {/CriOS|FxiOS/.test(navigator.userAgent) ? 'in the address bar' : 'at the bottom of Safari'}</li>
        <li>Scroll down and choose <strong>Add to Home Screen</strong></li>
        <li>Open DateU from your home screen</li>
      </ol>
    )
  } else {
    body = (
      <ol className="app-sheet-steps">
        <li>Tap the <strong>⋮</strong> menu in your browser</li>
        <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
        <li>Open DateU from your home screen</li>
      </ol>
    )
  }

  return (
    <div className="app-sheet-backdrop" onClick={close}>
      <div className="app-sheet" role="dialog" aria-label="Install DateU" onClick={(e) => e.stopPropagation()}>
        <div className="app-sheet-handle" />
        <img className="app-sheet-icon" src="/icons/icon-192.png" alt="" />
        <h3>{inApp ? 'Open DateU in your browser' : 'Get the DateU app'}</h3>
        <p>{inApp
          ? 'This app’s built-in browser can’t install DateU. Open it in your browser to add it to your home screen.'
          : 'Full screen, faster, with notifications for friend requests, calls and messages. Free, no app store needed.'}</p>
        {body}
        <button className="app-sheet-secondary" onClick={close}>Not now</button>
      </div>
    </div>
  )
}
