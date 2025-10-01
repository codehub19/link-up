import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  className?: string
  label?: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPWAButton({ className = 'btn btn-ghost', label = 'Install App' }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  const isStandalone = useMemo(() => {
    // Standalone if installed (Android/desktop via display-mode, iOS via navigator.standalone)
    const displayStandalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
    const iosStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true
    return Boolean(displayStandalone || iosStandalone)
  }, [])

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua)

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      toast.success('App installed')
    }

    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canShow = !installed && !isStandalone && (deferred !== null || (isIOS && isSafari))

  const onInstall = async () => {
    if (deferred) {
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') toast.success('Installing…')
        else toast.message('Install dismissed')
      } catch {
        toast.error('Unable to start install')
      } finally {
        setDeferred(null)
      }
      return
    }

    if (isIOS && isSafari) {
      toast.info('To install: tap the Share icon, then “Add to Home Screen”.')
      return
    }

    toast.message('Install not available in this browser.')
  }

  if (!canShow) return null

  return (
    <button className={className} onClick={onInstall} aria-label="Install app">
      {label}
    </button>
  )
}