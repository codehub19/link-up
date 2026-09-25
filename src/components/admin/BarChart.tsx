import { useMemo, useRef, useState } from 'react'

export type BarDatum = { label: string; value: number; hint?: string }

type Props = {
  data: BarDatum[]
  /** Accessible name / title shown above the chart */
  title: string
  subtitle?: string
  formatValue?: (v: number) => string
  /** Series color (one series per chart). Validated against the admin card surface. */
  color?: string
  height?: number
  /** Horizontal bars (ordered categories like a funnel) instead of columns over time */
  horizontal?: boolean
}

const SERIES_1 = '#3987e5'

function niceMax(v: number) {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * exp
}

/** Rounded data-end (4px), square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (w <= 0) return ''
  const rr = Math.min(r, h / 2, w)
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`
}

export default function BarChart({ data, title, subtitle, formatValue = (v) => v.toLocaleString(), color = SERIES_1, height = 220, horizontal }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)

  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data])
  const ticks = [0, max / 2, max]

  const onMove = (i: number, e: React.PointerEvent | React.FocusEvent) => {
    setHover(i)
    const rect = wrapRef.current?.getBoundingClientRect()
    const target = (e.currentTarget as Element).getBoundingClientRect()
    if (rect) setTip({ x: target.left + target.width / 2 - rect.left, y: target.top - rect.top })
  }
  const clear = () => { setHover(null); setTip(null) }

  // Layout in a fixed viewBox; SVG scales to the card width
  const W = 640
  const padL = horizontal ? 130 : 44
  const padR = horizontal ? 56 : 8
  const padT = 8
  const padB = horizontal ? 8 : 26
  const H = horizontal ? Math.max(height, data.length * 36 + padT + padB) : height
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const labelEvery = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div className="admin-card admin-chart" ref={wrapRef}>
      <div className="admin-chart-head">
        <div>
          <div className="admin-chart-title">{title}</div>
          {subtitle && <div className="admin-chart-sub">{subtitle}</div>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <div className="admin-table-wrapper" style={{ maxHeight: H + 40, overflow: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>{horizontal ? 'Stage' : 'Date'}</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}><td>{d.label}</td><td style={{ textAlign: 'right' }}>{formatValue(d.value)}{d.hint ? ` · ${d.hint}` : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {!horizontal && ticks.map((t) => {
            const y = padT + plotH - (t / max) * plotH
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--admin-text-muted)">{formatValue(t)}</text>
              </g>
            )
          })}

          {horizontal
            ? data.map((d, i) => {
              const band = plotH / data.length
              const bh = Math.min(24, band - 8)
              const y = padT + i * band + (band - bh) / 2
              const w = (d.value / max) * plotW
              return (
                <g key={d.label}>
                  <text x={padL - 10} y={y + bh / 2 + 4} textAnchor="end" fontSize={12} fill="var(--admin-text-muted)">{d.label}</text>
                  <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                  <path d={barPath(padL, y, Math.max(w, d.value > 0 ? 2 : 0), bh)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                  {/* Value at the bar tip (labels are few, so every stage is labeled) */}
                  <text x={padL + w + 8} y={y + bh / 2 + 4} fontSize={12} fill="var(--admin-text-main)" fontWeight={600}>{formatValue(d.value)}</text>
                  <rect
                    x={padL} y={padT + i * band} width={plotW} height={band} fill="transparent" tabIndex={0}
                    aria-label={`${d.label}: ${formatValue(d.value)}`}
                    onPointerMove={(e) => onMove(i, e)} onPointerLeave={clear} onFocus={(e) => onMove(i, e)} onBlur={clear}
                  />
                </g>
              )
            })
            : data.map((d, i) => {
              const band = plotW / Math.max(1, data.length)
              const bw = Math.min(24, Math.max(2, band - 2))
              const x = padL + i * band + (band - bw) / 2
              const h = (d.value / max) * plotH
              return (
                <g key={d.label}>
                  <path d={columnPath(x, padT + plotH - h, bw, h)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                  {i % labelEvery === 0 && (
                    <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--admin-text-muted)">{d.label}</text>
                  )}
                  <rect
                    x={padL + i * band} y={padT} width={band} height={plotH} fill="transparent" tabIndex={0}
                    aria-label={`${d.label}: ${formatValue(d.value)}`}
                    onPointerMove={(e) => onMove(i, e)} onPointerLeave={clear} onFocus={(e) => onMove(i, e)} onBlur={clear}
                  />
                </g>
              )
            })}
          {!horizontal && <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />}
        </svg>
      )}

      {!showTable && hover !== null && tip && data[hover] && (
        <div className="admin-chart-tip" style={{ left: tip.x, top: tip.y }}>
          <div className="admin-chart-tip-value">{formatValue(data[hover].value)}</div>
          <div className="admin-chart-tip-label">{data[hover].label}{data[hover].hint ? ` · ${data[hover].hint}` : ''}</div>
        </div>
      )}
    </div>
  )
}
