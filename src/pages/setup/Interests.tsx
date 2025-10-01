import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupShell, SetupHeader, StepFooter } from './SetupShared'
import './setup.styles.css'

export default function InterestsStep() {
  const nav = useNavigate()
  const all = useMemo(
    () => ['Photography','Cooking','Gaming','Music','Travel','Painting','Politics','Charity','Cooking','Pets','Sports','Fashion','Video Games','Shopping','Speeches','Art & Crafts','Swimming','Drinking','Extreme Sports','Fitness'],
    []
  )
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (t: string) => {
    setPicked(prev => prev.includes(t)
      ? prev.filter(x => x !== t)
      : prev.length < 3 ? [...prev, t] : prev
    )
  }
  return (
    <SetupShell step={4} total={6}>
      <SetupHeader title="Select up to 3 interests" sub="Share your likes and passions." />
      <div className="chips-grid">
        {all.map(t => (
          <button
            key={t}
            className={`chip-pill ${picked.includes(t) ? 'is-selected' : ''}`}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="chips-count">{picked.length}/3 selected</div>
      <StepFooter onNext={() => nav('/setup/photos')} disabled={picked.length === 0} />
    </SetupShell>
  )
}