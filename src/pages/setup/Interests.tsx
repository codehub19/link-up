import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

const ALL = ['Design','Music','Gaming','Fitness','Travel','Photography','Startups','Reading','Dance','Coding','Art','Volunteering','Food','Movies','Outdoors']

export default function Interests({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [picked, setPicked] = useState<string[]>(profile?.interests ?? [])
  const [saving, setSaving] = useState(false)

  const toggle = (i: string) => {
    setPicked(prev =>
      prev.includes(i)
        ? prev.filter(p => p !== i)
        : prev.length >= 3 ? prev : [...prev, i]
    )
  }

  const save = async () => {
    if (!user || picked.length === 0) return
    setSaving(true)
    try {
      await updateProfileAndStatus(user.uid, { interests: picked }, { interests: true })
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/setup/q1')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Your Interests</h1>
          <p className="setup-sub">Pick up to 3.</p>
          <div className="interest-grid">
            {ALL.map(i => (
              <button
                key={i}
                className={`interest-pill ${picked.includes(i) ? 'on' : ''}`}
                onClick={() => toggle(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="chips-count">{picked.length}/3 selected</div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={picked.length===0 || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}