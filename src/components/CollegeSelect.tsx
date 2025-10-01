import React, { useEffect, useMemo, useRef, useState } from 'react'

type College = { name: string; city?: string; state?: string }
type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function CollegeSelect({
  value,
  onChange,
  placeholder = 'Select your college',
  disabled,
  className = 'field-input',
}: Props) {
  const [all, setAll] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(value || '')
  const [highlight, setHighlight] = useState(0)
  const [lastChosen, setLastChosen] = useState<string | null>(value || null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // Fetch once
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/data/colleges-delhi-ncr.json', { cache: 'force-cache' })
        const json = (await res.json()) as College[]
        if (alive) setAll(json)
      } catch {
        if (alive) setAll([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // Sync input only when parent value changes
  useEffect(() => {
    setInput(value || '')
    setLastChosen(value || null)
  }, [value])

  const list = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return all.slice(0, 20)
    return all
      .filter(c => {
        const t = `${c.name} ${c.city ?? ''} ${c.state ?? ''}`.toLowerCase()
        return t.includes(q)
      })
      .slice(0, 20)
  }, [all, input])

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const select = (name: string) => {
    onChange(name)
    setInput(name)
    setLastChosen(name)
    setOpen(false) // hide list after selecting
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInput(v)

    // If user cleared the field, clear parent value too and keep list closed
    if (v.trim().length === 0) {
      if (value !== '') onChange('') // propagate clear
      setLastChosen(null)
      setOpen(false)
      setHighlight(0)
      return
    }

    // Only open when typing non-empty and different from last chosen
    const shouldOpen = v !== lastChosen
    setOpen(shouldOpen)
    if (shouldOpen) setHighlight(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Do not auto-open on keys; we only show when typing non-empty
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(list.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (list[highlight]) select(list[highlight].name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="college-wrap" ref={boxRef}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={input}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        disabled={disabled || loading}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="college-pop"
        role="combobox"
      />
      {open && (
        <div id="college-pop" className="college-pop" role="listbox">
          {loading ? (
            <div className="college-empty">Loading…</div>
          ) : list.length === 0 ? (
            <div className="college-empty">No matches</div>
          ) : (
            list.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                className={`college-item ${i === highlight ? 'is-active' : ''}`}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(c.name)}
              >
                <div className="ci-name">{c.name}</div>
                {(c.city || c.state) ? (
                  <div className="ci-meta">{[c.city, c.state].filter(Boolean).join(', ')}</div>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}