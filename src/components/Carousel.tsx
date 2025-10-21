import React, { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Stacked "deck" carousel (CodePen-style) with keyboard and button controls.
 * - Mobile: arrows visible; swipe disabled (as requested).
 * - Desktop: arrows + keyboard; swipe enabled.
 * - Keeps child card markup intact; we only wrap them.
 * - Now supports onChange callback for slide changes.
 */
export default function Carousel({
  children,
  itemWidth = 300,      // portrait card width
  gap = 16,             // spacing used for stacking offsets
  widthPercent = 80,    // consume ~80% page width and center
  stackDepth = 4,       // how many cards are visible behind the active one (desktop)
  ariaLabel = 'Carousel',
  onChange,             // <-- ADDED: callback for slide change
}: {
  children: React.ReactNode
  itemWidth?: number
  gap?: number
  widthPercent?: number
  stackDepth?: number
  ariaLabel?: string
  onChange?: (newIndex: number) => void // <-- ADDED
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

  // deterministic tiny angle per card for natural fanning
  const angles = useMemo(() => {
    const a: number[] = []
    for (let i = 0; i < count; i++) {
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

  // swipe is enabled only on desktop/tablet, disabled on mobile
  const swipeEnabled = !isMobile

  // drag / swipe
  const drag = useRef({
    active: false,
    startX: 0,
    dx: 0,
    pointerId: 0 as number | undefined,
  })

  const handleIdxChange = (newIdx: number) => {
    setIdx(newIdx)
    if (onChange) onChange(newIdx)
  }

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!swipeEnabled || count === 0) return
    drag.current.active = true
    drag.current.startX = e.clientX
    drag.current.dx = 0
    drag.current.pointerId = e.pointerId
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!swipeEnabled || !drag.current.active) return
    drag.current.dx = e.clientX - drag.current.startX
  }

  const onPointerEnd = () => {
    if (!swipeEnabled || !drag.current.active) return
    const dx = drag.current.dx
    drag.current.active = false
    const threshold = Math.max(48, itemWidth * 0.18)
    if (dx <= -threshold) handleIdxChange((idx + 1) % Math.max(1, count))
    else if (dx >= threshold) handleIdxChange((idx - 1 + Math.max(1, count)) % Math.max(1, count))
  }

  // keyboard (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (count <= 1) return
      if (e.key === 'ArrowRight') handleIdxChange((idx + 1) % count)
      if (e.key === 'ArrowLeft') handleIdxChange((idx - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, idx])

  const prev = () => handleIdxChange((idx - 1 + Math.max(1, count)) % Math.max(1, count))
  const next = () => handleIdxChange((idx + 1) % Math.max(1, count))

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
        // expose side padding to CSS so arrows can align with the true inner edges
        ['--side-pad' as any]: `${sidePad}px`,
      }}
    >
      <button className="deck-btn left" onClick={prev} aria-label="Previous">‹</button>

      <div
        ref={stageRef}
        className={`deck-stage ${swipeEnabled ? 'can-swipe' : 'no-swipe'}`}
        style={{ height: stageH, paddingLeft: sidePad, paddingRight: sidePad }}
        onPointerDown={swipeEnabled ? onPointerDown : undefined}
        onPointerMove={swipeEnabled ? onPointerMove : undefined}
        onPointerUp={swipeEnabled ? onPointerEnd : undefined}
        onPointerCancel={swipeEnabled ? onPointerEnd : undefined}
        onPointerLeave={swipeEnabled ? onPointerEnd : undefined}
      >
        <div className="deck-lane">
          {slides.map((ch, i) => {
            const d = forwardDist(i) // 0 (active), 1 (next), 2, ...
            const isActive = d === 0

            // Mobile: only show active card (others visually hidden)
            const hideOnMobile = isMobile && !isActive

            // Stacking transforms for desktop
            const depth = Math.min(d, stackDepth)
            const translateY = depth * (gap * 0.9)
            const translateX = depth * (gap * 0.35)
            const scale = isActive ? 1 : Math.max(0.8, 1 - depth * 0.06)
            const anglesIdx = i % angles.length
            const rot = isActive ? 0 : angles[anglesIdx] * (0.6 - depth * 0.08)
            const zIndex = 1000 - depth
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