import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { normalizeProfile } from '../../firebase'
import './setup.styles.css'

import Terms from './Terms'
import Gender from './Gender'
import Details from './Details'
import Interests from './Interests'
import Questions1 from './Questions1'
import Questions2 from './Questions2'
import Bio from './Bio'
import Photos from './Photos'

type StepId =
  | 'terms' | 'gender' | 'details' | 'interests'
  | 'q1' | 'q2' | 'bio' | 'photos' | 'done'

const ORDER: StepId[] = [
  'terms','gender','details','interests','q1','q2','bio','photos','done'
]

function derive(raw: any | null): StepId {
  const p = normalizeProfile(raw)
  if (!p) return 'terms'
  const s = p.setupStatus || {}
  if (!p.acceptedTermsVersion || !p.acceptedTermsAt || !s.terms) return 'terms'
  if (!p.gender || !s.gender) return 'gender'
  if (!p.name || !p.college || !p.dob || !s.profile) return 'details'
  if (!p.interests?.length || !s.interests) return 'interests'
  if (!p.communicationImportance || !p.conflictApproach || !p.sundayStyle || !s.q1) return 'q1'
  if (!p.travelPreference || !p.loveLanguage || !s.q2) return 'q2'
  if (!p.bio || !s.bio) return 'bio'
  if (!p.photoUrl || !s.photos) return 'photos'
  return 'done'
}

export default function ProfileWizard() {
  const { profile, loading } = useAuth()
  const [step, setStep] = useState<StepId>(() => derive(profile))

  useEffect(() => {
    const next = derive(profile)
    setStep(next)
    // Debug
    // console.log('[Wizard] profile:', profile, 'derived:', next)
  }, [profile])

  if (loading) return null

  const idx = ORDER.indexOf(step)
  const total = ORDER.length - 1
  const progress = Math.min(100, (idx / total) * 100)

  const advance = () => {
    setStep(prev => {
      const i = ORDER.indexOf(prev)
      return ORDER[Math.min(i + 1, ORDER.length - 1)]
    })
  }
  const back = () => {
    setStep(prev => {
      const i = ORDER.indexOf(prev)
      return ORDER[Math.max(i - 1, 0)]
    })
  }
  const canBack = step !== 'terms' && step !== 'done'
  const shared = { embedded: true, onComplete: advance }

  let body: React.ReactNode
  switch (step) {
    case 'terms': body = <Terms {...shared} />; break
    case 'gender': body = <Gender {...shared} />; break
    case 'details': body = <Details {...shared} />; break
    case 'interests': body = <Interests {...shared} />; break
    case 'q1': body = <Questions1 {...shared} />; break
    case 'q2': body = <Questions2 {...shared} />; break
    case 'bio': body = <Bio {...shared} />; break
    case 'photos': body = <Photos {...shared} />; break
    case 'done':
      body = (
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">All Set 🎉</h1>
          <p className="setup-sub">Your profile is complete. Head to the dashboard.</p>
          <div className="setup-card-footer">
            <a className="btn-primary-lg" href="/dashboard">Go to Dashboard</a>
          </div>
        </section>
      )
      break
    default:
      body = null
  }

  return (
    <>
      <Navbar />
      <div className="setup-wrap">
        <div className="setup-top">
          <button
            className="setup-back"
            onClick={back}
            disabled={!canBack}
            aria-label="Back"
            style={!canBack ? { opacity: 0.3, cursor: 'default' } : undefined}
          >←</button>
          <div className="setup-progress">
            <div className="setup-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="setup-step">
            {step === 'done' ? 'Complete' : `${Math.min(idx + 1, total)}/${total}`}
          </span>
        </div>
        <div className="container narrow">
          {body}
        </div>
      </div>
    </>
  )
}