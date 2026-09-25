import React, { useEffect, useMemo, useRef, useState } from 'react'

type College = { name: string; city?: string; state?: string }
type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

let collegeCache: College[] | null = null
let remotePromise: Promise<College[]> | null = null

async function fetchFullList(): Promise<College[]> {
  const res = await fetch('https://raw.githubusercontent.com/PriyanKishoreMS/colleges-api/master/data/colleges.csv')
  if (!res.ok) throw new Error('Failed to fetch')
  const text = await res.text()
  // Parse CSV
  const rows = text.split('\n')
  // Skip header (id,state,name,address_line1,address_line2,city,district,pin_code)
  const data: College[] = []
  // Determine indexes (header row is 0)
  // Simple CSV parsing (handling quotes basics) but for this specific file, we can be a bit more robust or heuristic
  // Standard: id,state,name,...
  // indices: state=1, name=2, city=5, district=6

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim()
    if (!row) continue
    // Minimal CSV parser that respects quoted commas
    let inQuote = false
    const fields: string[] = []
    let current = ''
    for (let c = 0; c < row.length; c++) {
      const char = row[c]
      if (char === '"') {
        inQuote = !inQuote
      } else if (char === ',' && !inQuote) {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current) // last field

    if (fields.length < 3) continue

    // CSV columns: id,state,name,address_line1,address_line2,city,district,pin_code
    const name = fields[2]?.replace(/^"|"$/g, '').trim()
    const city = fields[5]?.replace(/^"|"$/g, '').trim() || fields[6]?.replace(/^"|"$/g, '').trim() // city or district
    const state = fields[1]?.replace(/^"|"$/g, '').trim()

    if (name) {
      data.push({ name, city, state })
    }
  }

  // Remove duplicates
  const seen = new Set()
  const unique: College[] = []
  for (const m of data) {
    // Key by name + city to differentiation similarly named colleges in different places
    const key = (m.name + m.city).toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(m)
    }
  }
  return unique
}

function loadColleges(cb: (list: College[]) => void) {
  if (collegeCache) { cb(collegeCache); return }
  fetch('/data/colleges-delhi-ncr.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((local: College[]) => { if (!collegeCache) cb(local) })
    .catch(() => { })
  remotePromise ||= fetchFullList()
  remotePromise
    .then((full) => {
      collegeCache = full
      cb(full)
    })
    .catch(() => { /* keep the built-in list; typing a custom college still works */ })
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

  // A small built-in list shows instantly; the full list (~43k colleges) is
  // added when it arrives. Loaded once per session and shared by every picker.
  useEffect(() => {
    let alive = true
    loadColleges((list) => { if (alive) { setAll(list); setLoading(false) } })
    return () => { alive = false }
  }, [])

  // Sync input only when parent value changes
  useEffect(() => {
    setInput(value || '')
    setLastChosen(value || null)
  }, [value])

  const list = useMemo(() => {
    const q = input.trim().toLowerCase()
    // If empty input, show nothing or top items? 
    // Maybe show top 20 or nothing. Let's show nothing to be cleaner unless typing.
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

    // ALLOW CUSTOM INPUT:
    // We strictly update the parent onChange with the custom value.
    onChange(v)

    if (v.trim().length === 0) {
      setLastChosen(null)
      setOpen(false)
      setHighlight(0)
      return
    }

    // Only open when typing non-empty
    setOpen(true)
    setHighlight(0)
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
        disabled={disabled}
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