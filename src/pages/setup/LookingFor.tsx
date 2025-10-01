import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupShell, SetupHeader, StepFooter } from './SetupShared'
import './setup.styles.css'

const OPTIONS = [
  'A relationship',
  'Something casual',
  'I’m not sure yet',
  'Prefer not to say',
]

export default function LookingForStep() {
  const [value, setValue] = useState<string | null>(null)
  const nav = useNavigate()
  return (
    <SetupShell step={3} total={6}>
      <SetupHeader title="I am looking for…" sub="Choose what best fits right now." />
      <div className="options-stack">
        {OPTIONS.map(opt => (
          <button
            key={opt}
            className={`option-row ${value === opt ? 'is-selected' : ''}`}
            onClick={() => setValue(opt)}
          >
            <span>{opt}</span>
            <span className="radio-dot" />
          </button>
        ))}
      </div>
      <StepFooter onNext={() => nav('/setup/interests')} disabled={!value} />
    </SetupShell>
  )
}