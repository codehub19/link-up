import React, { useEffect, useRef, useState } from 'react'

function useCountUp(to: number, duration = 1200) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let started = false
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !started) {
          started = true
          const start = performance.now()
          const step = (t: number) => {
            const p = Math.min((t - start) / duration, 1)
            setVal(to * p)
            if (p < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
          io.disconnect()
        }
      })
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return { ref, val }
}

function Metric({
  to,
  suffix,
  title,
  desc,
}: {
  to: number
  suffix?: string
  title: string
  desc: string
}) {
  const { ref, val } = useCountUp(to)
  const display =
    suffix === 'k'
      ? `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : suffix === '%'
      ? `${Math.round(val)}%`
      : `${Math.round(val).toLocaleString()}${suffix ?? ''}`

  return (
    <article className="metric-item-band">
      <div className="metric-value" aria-live="polite" aria-label={`${title} ${display}`}>
        <span ref={ref}>{display}</span>
      </div>
      <div className="metric-title">{title}</div>
      <p className="metric-desc">{desc}</p>
    </article>
  )
}

export default function MetricsBand() {
  return (
    <section className="section metrics-band" aria-label="Key stats">
      <div className="container">
        <div className="metrics-band-wrap">
          <Metric
            to={12000}
            suffix="+"
            title="Likes exchanged"
            desc="Across recent matching rounds."
          />
          <Metric
            to={600}
            suffix="%"
            title="Positive feedback"
            desc="Students reporting a better dating experience."
          />
          <Metric
            to={10000}
            suffix=""
            title="Rounds joined"
            desc="Profiles entered into curated rounds."
          />
          <Metric
            to={200}
            suffix="+"
            title="5‑star reviews"
            desc="Rated by real students across colleges."
          />
        </div>
      </div>
    </section>
  )
}