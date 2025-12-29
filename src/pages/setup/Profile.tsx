import React, { useEffect, useState } from 'react'
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
import Preferences from './Preferences'
import Questions1 from './Questions1'
import Questions2 from './Questions2'
import Bio from './Bio'
import Photos from './Photos'

import RelationshipGoals from './RelationshipGoals'
import DealBreakers from './DealBreakers'
import LookingFor from './LookingFor'
import Height from './Height'

type StepId =
  | 'terms' | 'gender' | 'details' | 'referral' | 'looking-for' | 'height' | 'interests' | 'preferences'
  | 'relationship-goals' | 'deal-breakers'
  | 'q1' | 'q2' | 'bio' | 'photos' | 'done'

const ORDER: StepId[] = [
  'terms', 'gender', 'details', 'referral', 'looking-for', 'height', 'interests', 'preferences',
  'relationship-goals', 'deal-breakers',
  'q1', 'q2', 'bio', 'photos', 'done'
]

function derive(raw: any | null): StepId {
  const p = normalizeProfile(raw)
  if (!p) return 'terms'
  const s = (p.setupStatus || {}) as any
  if (!p.acceptedTermsVersion || !p.acceptedTermsAt || !s.terms) return 'terms'
  if (!p.gender || !s.gender) return 'gender'
  const isCollege = !p.userType || p.userType === 'college'
  if (!p.name || (isCollege && !p.college) || !p.dob || !s.profile) return 'details'
  if (!s.referral) return 'referral'

  // New Steps
  if (!p.datingPreference || !s.lookingFor) return 'looking-for'
  if (!p.height || !s.height) return 'height'

  if (!p.interests?.length || !s.interests) return 'interests'

  // Preferences
  if ((p.ageRangeMin === undefined) || !s.preferences) return 'preferences'
  // New Steps
  if (!p.lookingFor || !s.relationshipGoals) return 'relationship-goals'
  // Deal breakers can be empty, so relies on setupStatus flag
  if (!s.dealBreakers) return 'deal-breakers'

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
    case 'referral': body = <Referral {...shared} />; break
    case 'looking-for': body = <LookingFor {...shared} />; break
    case 'height': body = <Height {...shared} />; break
    case 'interests': body = <Interests {...shared} />; break
    case 'preferences': body = <Preferences {...shared} />; break
    case 'relationship-goals': body = <RelationshipGoals {...shared} />; break
    case 'deal-breakers': body = <DealBreakers {...shared} />; break
    case 'q1': body = <Questions1 {...shared} />; break
    case 'q2': body = <Questions2 {...shared} />; break
    case 'bio': body = <Bio {...shared} />; break
    case 'photos': body = <Photos {...shared} />; break
    case 'done':
      body = (
        <section className="setup-card">
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
      <HomeBackground />
      <Navbar />
      <div className="setup-wrap">
        <div className="setup-top">
          <button
            className="setup-back"
            onClick={back}
            disabled={!canBack}
            aria-label="Back"
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