import React, { useMemo } from 'react'

const ALL_INTERESTS = [
  'Design', 'Music', 'Gaming', 'Fitness', 'Travel', 'Photography', 'Startups',
  'Reading', 'Books', 'Dance', 'Coding', 'Tech', 'Art', 'Volunteering', 'Food',
  'Movies', 'Outdoors'
]

export default function InterestsSelect({
  value,
  onChange,
  max = 5,
}: {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
}) {
  const selected = new Set(value)
  const options = useMemo(
    () => ALL_INTERESTS.map((i) => ({ label: i, value: i })),
    []
  )

  const toggle = (v: string) => {
    const next = new Set(selected)
    if (selected.has(v)) next.delete(v)
    else {
      if (selected.size >= max) return
      next.add(v)
    }
    onChange(Array.from(next))
  }

  return (
    <div className="chip-grid">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          className={`chip ${selected.has(opt.value) ? 'chip-selected' : ''}`}
          onClick={() => toggle(opt.value)}
        >
          {opt.label}
        </button>
      ))}
      <div className="muted" style={{ marginTop: 8 }}>
        Selected {selected.size}/{max}
      </div>
    </div>
  )
}