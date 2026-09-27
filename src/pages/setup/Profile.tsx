import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import { useAuth } from '../../state/AuthContext'
import { normalizeProfile } from '../../firebase'
import './setup.styles.css'

import Terms from './Terms'
import Gender from './Gender'
import Details from './Details'
import Referral from './Referral'
import Interests from './Interests'
import Bio from './Bio'
import Photos from './Photos'

// Sign-up asks only what everyone needs (friends, events, chat, calls).
// Dating details are asked in the Dating tab when someone wants to try it.
type StepId = 'terms' | 'gender' | 'details' | 'referral' | 'interests' | 'bio' | 'photos' | 'done'

const ORDER: StepId[] = ['terms', 'gender', 'details', 'referral', 'interests', 'bio', 'photos', 'done']

function derive(raw: any | null): StepId {
  const p = normalizeProfile(raw)
  if (!p) return 'terms'
  const s = (p.setupStatus || {}) as any
  if (!p.acceptedTermsVersion || !p.acceptedTermsAt || !s.terms) return 'terms'
  if (!p.gender || !s.gender) return 'gender'
  const isCollege = !p.userType || p.userType === 'college'
  if (!p.name || (isCollege && !p.college) || !p.dob || !s.profile) return 'details'
  if (!s.referral) return 'referral'
  if (!p.interests?.length || !s.interests) return 'interests'
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
  }, [profile])

  if (loading) return null

  const idx = ORDER.indexOf(step)
  const total = ORDER.length - 1
  const progress = Math.min(100, ((idx + 1) / total) * 100)

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
    case 'referral': body = <Referral {...shared} />; break
    case 'interests': body = <Interests {...shared} />; break
    case 'bio': body = <Bio {...shared} />; break
    case 'photos': body = <Photos {...shared} />; break
    case 'done':
      body = (
        <section className="setup-card">
          <h1 className="setup-title">You’re in 🎉</h1>
          <p className="setup-sub">Your profile is ready. Make friends, join events and chat — and try dating whenever you like.</p>
          <div className="setup-card-footer">
            <Link className="btn-primary-lg" to="/dashboard" replace>Let’s go</Link>
          </div>
        </section>
      )
      break
    default:
      body = null
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="setup-wrap">
        <div className="setup-top">
          <button
            className="setup-back"
            onClick={back}
            disabled={!canBack}
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
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