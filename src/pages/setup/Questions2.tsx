import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

const TRAVEL = [
  { value: 'relaxing_resort', label: 'A. Relaxing beach / resort getaway.' },
  { value: 'explore_city', label: 'B. Backpacking / exploring a new city.' },
  { value: 'active_adventure', label: 'C. Active trip (hiking / skiing / camping).' },
  { value: 'visit_family', label: 'D. Visiting family or friends.' },
]
const LOVE = [
  { value: 'words', label: 'A. Words of Affirmation' },
  { value: 'quality_time', label: 'B. Quality Time' },
  { value: 'acts', label: 'C. Acts of Service' },
  { value: 'touch', label: 'D. Physical Touch' },
  { value: 'gifts', label: 'E. Receiving Gifts' },
]

export default function Questions2({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [travelPreference, setTravelPreference] = useState(profile?.travelPreference || '')
  const [loveLanguage, setLoveLanguage] = useState(profile?.loveLanguage || '')
  const ready = travelPreference && loveLanguage
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user || !ready) return
    setSaving(true)
    try {
      await updateProfileAndStatus(
        user.uid,
        { travelPreference, loveLanguage },
        { q2: true }
      )
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/setup/bio')
      }
    } finally {
      setSaving(false)
    }
  }

  const group = (title: string, cur: string, setter: (v: string) => void, opts: any[]) => (
    <fieldset className="qa-group">
      <legend>{title}</legend>
      {opts.map(o => (
        <label key={o.value} className={`qa-option ${cur === o.value ? 'on' : ''}`}>
          <input type="radio" value={o.value} checked={cur === o.value} onChange={() => setter(o.value)} />
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
          <h1 className="setup-title">Preferences (2)</h1>
          {group('Travel Preference', travelPreference, setTravelPreference, TRAVEL)}
          {group('Love Language', loveLanguage, setLoveLanguage, LOVE)}
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