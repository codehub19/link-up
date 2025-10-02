import React, { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Stacked "deck" carousel (CodePen-style) with swipe and keyboard support.
 * - Keeps child card markup intact (we only wrap them).
 * - Mobile: one visible card, swipe to change.
 * - Desktop: center card with a few fanned cards behind.
 * - No clones; circular by changing index.
 */
export default function Carousel({
  children,
  itemWidth = 300,      // portrait card width (matches your ProfileMiniCard)
  gap = 16,             // visual spacing used for stacking offsets
  widthPercent = 80,    // consume ~80% page width by default and center the carousel
  stackDepth = 4,       // how many cards are visible behind the active one (desktop)
  ariaLabel = 'Carousel',
}: {
  children: React.ReactNode
  itemWidth?: number
  gap?: number
  widthPercent?: number
  stackDepth?: number
  ariaLabel?: string
}) {
  const slides = useMemo(() => React.Children.toArray(children), [children])
  const count = slides.length

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLDivElement>(null)

  // active card index
  const [idx, setIdx] = useState(0)

  // stage sizing
  const [vw, setVw] = useState(0)
  const [stageH, setStageH] = useState<number | undefined>(undefined)
  const isMobile = vw <= 640

  // seeded tiny angle per card for natural fanning (stable across renders)
  const angles = useMemo(() => {
    const a: number[] = []
    for (let i = 0; i < count; i++) {
      // deterministic pseudo-random in [-10, 10] but avoid near 0 so it’s visible
      const seed = Math.sin(i * 12.9898) * 43758.5453
      let r = (seed - Math.floor(seed)) * 20 - 10
      if (Math.abs(r) < 2) r = r < 0 ? -2 : 2
      a.push(r)
    }
    return a
  }, [count])

  // observe stage width
  useEffect(() => {
    const el = stageRef.current
    const set = () => setVw(el?.clientWidth || 0)
    set()
    const ro = new ResizeObserver(set)
    if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // reserve height based on a real card
  useEffect(() => {
    const measure = () => {
      if (!firstItemRef.current) return
      setStageH(firstItemRef.current.offsetHeight)
    }
    measure()
    const t = setInterval(measure, 200)
    return () => clearInterval(t)
  }, [slides, itemWidth, gap, vw])

  // circular helper: distance forward from idx to i (0..count-1)
  const forwardDist = (i: number) => {
    if (count === 0) return 0
    let d = i - idx
    if (d < 0) d += count
    return d
  }

  // drag / swipe
  const drag = useRef({
    active: false,
    startX: 0,
    dx: 0,
    pointerId: 0 as number | undefined,
  })

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (count === 0) return
    drag.current.active = true
    drag.current.startX = e.clientX
    drag.current.dx = 0
    drag.current.pointerId = e.pointerId
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!drag.current.active) return
    drag.current.dx = e.clientX - drag.current.startX
    // optional: you can set a CSS var here for micro-parallax if desired
  }

  const onPointerEnd = () => {
    if (!drag.current.active) return
    const dx = drag.current.dx
    drag.current.active = false
    const threshold = Math.max(48, itemWidth * 0.18)
    if (dx <= -threshold) setIdx((i) => (i + 1) % Math.max(1, count))
    else if (dx >= threshold) setIdx((i) => (i - 1 + Math.max(1, count)) % Math.max(1, count))
    // else snap to current (no-op)
  }

  // keyboard (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (count <= 1) return
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % count)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  const prev = () => setIdx((i) => (i - 1 + Math.max(1, count)) % Math.max(1, count))
  const next = () => setIdx((i) => (i + 1) % Math.max(1, count))

  // center + breathing room
  const minPad = isMobile ? 16 : 32
  const centerPad = Math.max(0, (vw - itemWidth) / 2)
  const sidePad = Math.max(minPad, centerPad)

  return (
    <div
      ref={wrapRef}
      className="deck-wrap"
      role="region"
      aria-label={ariaLabel}
      style={{
        width: `${Math.max(0, Math.min(100, widthPercent))}%`,
        margin: '0 auto',
      }}
    >
      <button className="deck-btn left" onClick={prev} aria-label="Previous">‹</button>

      <div
        ref={stageRef}
        className="deck-stage"
        style={{ height: stageH, paddingLeft: sidePad, paddingRight: sidePad }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        <div className="deck-lane">
          {slides.map((ch, i) => {
            const d = forwardDist(i) // 0 (active), 1 (next), 2, ...
            const isActive = d === 0

            // Mobile: only show active card
            const hideOnMobile = isMobile && !isActive

            // Stacking transforms for desktop
            const depth = Math.min(d, stackDepth)
            const translateY = depth * (gap * 0.9)   // vertical drop per layer
            const translateX = depth * (gap * 0.35)  // slight horizontal offset
            const scale = isActive ? 1 : Math.max(0.8, 1 - depth * 0.06)
            const rot = isActive ? 0 : angles[i] * (0.6 - depth * 0.08) // smaller angle deeper in stack
            const zIndex = 1000 - depth

            // Fade deeper layers a touch
            const opacity = isActive ? 1 : Math.max(0.6, 1 - depth * 0.12)

            return (
              <div
                key={(ch as any)?.key ?? i}
                className={`deck-item ${isActive ? 'is-active' : 'is-behind'}`}
                style={{
                  width: itemWidth,
                  opacity: hideOnMobile ? 0 : opacity,
                  transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) rotate(${rot}deg) scale(${scale})`,
                  zIndex,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div ref={i === 0 ? firstItemRef : undefined} className="deck-item-inner">
                  {ch}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button className="deck-btn right" onClick={next} aria-label="Next">›</button>
    </div>
  )
}