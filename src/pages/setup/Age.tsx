import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupShell, SetupHeader, StepFooter } from './SetupShared'
import './setup.styles.css'

export default function AgeStep() {
  const nav = useNavigate()
  const listRef = useRef<HTMLDivElement | null>(null)
  const ages = useMemo(() => Array.from({ length: 43 }, (_, i) => i + 18), [])
  const [age, setAge] = useState<number>(22)

  useEffect(() => {
    // center selected on mount
    const el = listRef.current
    if (!el) return
    const idx = ages.indexOf(age)
    const itemH = 48
    el.scrollTop = Math.max(0, idx * itemH - itemH * 2)
  }, [ages, age])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    const itemH = 48
    const idx = Math.round(el.scrollTop / itemH) + 2 // center line
    const val = ages[Math.min(ages.length - 1, Math.max(0, idx))]
    if (val) setAge(val)
  }

  return (
    <SetupShell step={1} total={6}>
      <SetupHeader title="How old are you?" sub="Provide your age in years." />
      <div className="age-wheel">
        <div className="age-wheel-mask" aria-hidden />
        <div className="age-wheel-list" ref={listRef} onScroll={onScroll}>
          {ages.map(a => (
            <div key={a} className={`age-item ${a === age ? 'is-active' : ''}`}>{a}</div>
          ))}
        </div>
        <div className="age-wheel-indicator" aria-hidden />
      </div>
      <StepFooter onNext={() => nav('/setup/gender')} />
    </SetupShell>
  )
}