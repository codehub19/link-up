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
