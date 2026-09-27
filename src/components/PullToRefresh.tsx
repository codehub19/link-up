import { useEffect, useRef, useState } from 'react'
import './PullToRefresh.css'

const THRESHOLD = 72
const MAX_PULL = 120

/** Nearest ancestor that scrolls vertically (the page itself if none). */
function scrollParent(el: Element | null): Element | null {
  while (el && el !== document.body) {
    const s = getComputedStyle(el)
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el
    el = el.parentElement
  }
  return null
}

/**
 * Native-style pull-to-refresh: pull down from the top of the screen and let go.
 * Works with the page scroll and with inner scrolling lists (like the chat list).
 */
export default function PullToRefresh({ enabled, onRefresh }: { enabled: boolean; onRefresh: () => Promise<void> | void }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const active = useRef(false)
  const pullRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1) return
      const t = e.target as Element
      // Not from inside sheets, dialogs, the call screen, an open conversation or text fields
      if (t.closest('[role="dialog"], .cs-screen, .dm-screen, .dm-convo, input, textarea, select, [data-no-ptr]')) return
      if (window.scrollY > 0) return
      const sp = scrollParent(t)
      if (sp && sp.scrollTop > 0) return
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      active.current = false
    }

    const onMove = (e: TouchEvent) => {
      if (!start.current) return
      const dx = e.touches[0].clientX - start.current.x
      const dy = e.touches[0].clientY - start.current.y
      if (!active.current) {
        // Only vertical pulls downwards (leave sideways swipes and scrolling alone)
        if (dy < 8 || Math.abs(dx) > Math.abs(dy)) {
          if (dy < 0 || Math.abs(dx) > 10) start.current = null
          return
        }
        active.current = true
      }
      if (e.cancelable) e.preventDefault()
      const d = Math.min(MAX_PULL, (dy - 8) * 0.5)
      pullRef.current = d
      setPull(d)
    }

    const onEnd = async () => {
      const was = active.current
      start.current = null
      active.current = false
      if (!was) return
      const d = pullRef.current
      pullRef.current = 0
      if (d < THRESHOLD) { setPull(0); return }
      busy.current = true
      setRefreshing(true)
      setPull(THRESHOLD * 0.8)
      try { navigator.vibrate?.(10) } catch { }
      const minTime = new Promise((r) => setTimeout(r, 700))
      try {
        await Promise.all([Promise.resolve(onRefresh()), minTime])
      } finally {
        busy.current = false
        setRefreshing(false)
        setPull(0)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, onRefresh])

  if (!enabled || (pull === 0 && !refreshing)) return null
  const progress = Math.min(1, pull / THRESHOLD)
  return (
    <div
      className={`ptr ${refreshing ? 'spinning' : ''} ${progress >= 1 ? 'ready' : ''}`}
      style={{ transform: `translate(-50%, ${pull}px)`, opacity: Math.min(1, progress * 1.4) }}
      role="status"
      aria-label={refreshing ? 'Refreshing' : 'Pull to refresh'}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }} aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    </div>
  )
}
