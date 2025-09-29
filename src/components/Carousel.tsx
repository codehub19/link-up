import React, { useRef } from 'react'

export default function Carousel({
  children,
  itemWidth = 220,
  gap = 12,
}: {
  children: React.ReactNode
  itemWidth?: number
  gap?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: -1 | 1) => {
    if (!ref.current) return
    ref.current.scrollBy({ left: dir * (itemWidth + gap) * 2, behavior: 'smooth' })
  }
  return (
    <div className="carousel-wrap">
      <button className="carousel-btn left" onClick={() => scrollBy(-1)} aria-label="Previous">‹</button>
      <div className="carousel" ref={ref} style={{ gap }}>
        {children}
      </div>
      <button className="carousel-btn right" onClick={() => scrollBy(1)} aria-label="Next">›</button>
    </div>
  )
}