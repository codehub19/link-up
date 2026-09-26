// Install / standalone helpers shared by the app shell.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

// The browser fires this once, early; capture it at startup so any screen can use it later.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function getInstallPrompt() {
  return deferred
}

export function onInstallPromptChange(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const d = deferred
  deferred = null
  await d.prompt()
  const choice = await d.userChoice
  listeners.forEach((l) => l())
  return choice.outcome === 'accepted'
}

/** Running as an installed app (home-screen icon), not in a browser tab. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Desktop/laptop = anything that isn't a phone or tablet. Based on the device,
 * not the window size, so shrinking the browser window or a touchscreen
 * laptop doesn't get around it. Phones and tablets (including iPads that
 * report themselves as a Mac) are allowed.
 */
export function isDesktopDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const uaData = (navigator as any).userAgentData
  if (uaData?.mobile) return false
  if (/Android|iPhone|iPod|iPad|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return false
  // iPadOS 13+ Safari pretends to be a Mac; real Macs have no multi-touch screen
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false
  return true
}

// Remember a referral code from an invite link (dateu.in/?ref=CODE) so the
// sign-up "Referral code" step is pre-filled, even after the Google sign-in.
try {
  const ref = new URLSearchParams(window.location.search).get('ref')
  if (ref && /^[A-Za-z0-9]{3,20}$/.test(ref)) {
    localStorage.setItem('dateu.referralCode', ref.toUpperCase())
    sessionStorage.setItem('referralCode', ref.toUpperCase())
  }
} catch { }
