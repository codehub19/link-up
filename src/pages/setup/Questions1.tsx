import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

const COM = [
  { value: 'extremely', label: 'A. Extremely important—must be an excellent communicator.' },
  { value: 'very', label: 'B. Very important—I need open, honest discussion.' },
  { value: 'moderate', label: 'C. Moderately important—I can work with most styles.' },
  { value: 'low', label: 'D. Not a huge priority; actions speak louder.' },
]
const CONFLICT = [
  { value: 'address_immediately', label: 'A. Discuss it immediately and resolve quickly.' },
  { value: 'cool_down', label: 'B. Need time to cool down first.' },
  { value: 'wait_other', label: 'C. Wait for the other person to initiate.' },
  { value: 'avoid', label: 'D. Avoid conflict / keep peace.' },
]
const SUNDAY = [
  { value: 'relax_brunch', label: 'A. Sleeping in, late brunch, relaxing.' },
  { value: 'active_fitness', label: 'B. Gym / run / active outing.' },
  { value: 'personal_project', label: 'C. Personal project or learning.' },
  { value: 'social_family', label: 'D. Time with family or friends.' },
]

export default function Questions1({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [communicationImportance, setCommunicationImportance] = useState(profile?.communicationImportance || '')
  const [conflictApproach, setConflictApproach] = useState(profile?.conflictApproach || '')
  const [sundayStyle, setSundayStyle] = useState(profile?.sundayStyle || '')
  const ready = communicationImportance && conflictApproach && sundayStyle
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user || !ready) return
    setSaving(true)
    try {
      await updateProfileAndStatus(
        user.uid,
        { communicationImportance, conflictApproach, sundayStyle },
        { q1: true }
      )
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/setup/q2')
      }
    } finally {
      setSaving(false)
    }
  }

  const group = (title: string, cur: string, set: (v: string) => void, opts: any[]) => (
    <fieldset className="qa-group">
      <legend>{title}</legend>
      {opts.map(o => (
        <label key={o.value} className={`qa-option ${cur === o.value ? 'on' : ''}`}>
          <input type="radio" value={o.value} checked={cur === o.value} onChange={() => set(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Preferences (1)</h1>
          {group('Communication Importance', communicationImportance, setCommunicationImportance, COM)}
          {group('Conflict Style', conflictApproach, setConflictApproach, CONFLICT)}
          {group('Ideal Sunday', sundayStyle, setSundayStyle, SUNDAY)}
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!ready || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}