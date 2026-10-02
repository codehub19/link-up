import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../state/AuthContext'
import { normalizeProfile, updateProfileAndStatus } from '../../firebase'
import LookingFor from '../setup/LookingFor'
import Height from '../setup/Height'
import Preferences from '../setup/Preferences'
import RelationshipGoals from '../setup/RelationshipGoals'
import DealBreakers from '../setup/DealBreakers'
import Questions1 from '../setup/Questions1'
import Questions2 from '../setup/Questions2'
import Photos from '../setup/Photos'
import { hasRealPhoto } from '../../utils/avatar'
import '../setup/setup.styles.css'

type StepId = 'photos' | 'looking-for' | 'height' | 'preferences' | 'relationship-goals' | 'deal-breakers' | 'q1' | 'q2' | 'finish'
// Real photos first: dating needs authenticity, so an avatar isn't enough here
const ORDER: StepId[] = ['photos', 'looking-for', 'height', 'preferences', 'relationship-goals', 'deal-breakers', 'q1', 'q2', 'finish']

function derive(raw: any): StepId {
  const p = normalizeProfile(raw)
  if (!p) return 'photos'
  if (!hasRealPhoto(p as any)) return 'photos'
  const s = (p.setupStatus || {}) as any
  if (!s.lookingFor) return 'looking-for'
  if (!p.height || !s.height) return 'height'
  if (p.ageRangeMin === undefined || !s.preferences) return 'preferences'
  if (!p.lookingFor || !s.relationshipGoals) return 'relationship-goals'
  if (!s.dealBreakers) return 'deal-breakers'
  if (!p.communicationImportance || !p.conflictApproach || !p.sundayStyle || !s.q1) return 'q1'
  if (!p.travelPreference || !p.loveLanguage || !s.q2) return 'q2'
  return 'finish'
}

/** Dating details, asked when someone decides to try dating (not at sign-up). */
export default function DatingSetup() {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState<StepId>(() => derive(profile))
  const [finishing, setFinishing] = useState(false)
  const roundsPath = profile?.gender === 'male' ? '/dashboard/male/rounds' : '/dashboard/round'

  useEffect(() => { setStep(derive(profile)) }, [profile])

  // Already set up (e.g. opened again with Back): go to the rounds
  useEffect(() => {
    if (profile?.datingProfileComplete && profile?.datingEnabled !== false && hasRealPhoto(profile as any)) nav(roundsPath, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) return null

  const idx = ORDER.indexOf(step)
  const total = ORDER.length - 1
  const progress = Math.min(100, ((idx + 1) / total) * 100)
  const advance = () => setStep((prev) => ORDER[Math.min(ORDER.indexOf(prev) + 1, ORDER.length - 1)])
  const back = () => setStep((prev) => ORDER[Math.max(ORDER.indexOf(prev) - 1, 0)])
  const shared = { embedded: true, onComplete: advance }

  const finish = async () => {
    setFinishing(true)
    try {
      if (!hasRealPhoto(profile as any)) { setStep('photos'); toast.error('Add at least one real photo to use dating.'); return }
      await updateProfileAndStatus(user.uid, { datingProfileComplete: true, datingEnabled: true } as any)
      await refreshProfile()
      toast.success('Dating is on! 💘')
      nav(roundsPath, { replace: true })
    } catch {
      toast.error('Could not save. Please try again.')
    } finally {
      setFinishing(false)
    }
  }

  let body: React.ReactNode
  switch (step) {
    case 'photos': body = <Photos {...shared} photosOnly />; break
    case 'looking-for': body = <LookingFor {...shared} />; break
    case 'height': body = <Height {...shared} />; break
    case 'preferences': body = <Preferences {...shared} />; break
    case 'relationship-goals': body = <RelationshipGoals {...shared} />; break
    case 'deal-breakers': body = <DealBreakers {...shared} />; break
    case 'q1': body = <Questions1 {...shared} />; break
    case 'q2': body = <Questions2 {...shared} />; break
    default:
      body = (
        <section className="setup-card">
          <div style={{ fontSize: 48, textAlign: 'center' }}>💘</div>
          <h1 className="setup-title" style={{ textAlign: 'center' }}>You’re ready to date</h1>
          <p className="setup-sub" style={{ textAlign: 'center' }}>
            Join a matching round, pick who you like, and we’ll match you when it’s mutual. Only people in dating can see your dating details.
          </p>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" onClick={finish} disabled={finishing}>
              {finishing ? <LoadingSpinner color="#fff" size={20} /> : 'Start dating'}
            </button>
          </div>
        </section>
      )
  }

  return (
    <>
      <Navbar />
      <div className="setup-wrap dating-setup">
        <div className="setup-top">
          <button className="setup-back" onClick={back} disabled={idx === 0} aria-label="Previous question">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="setup-progress">
            <div className="setup-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="setup-step">{step === 'finish' ? 'Done' : `${idx + 1}/${total}`}</span>
        </div>
        <div className="container narrow">{body}</div>
      </div>
    </>
  )
}
