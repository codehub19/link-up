import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import './setup.styles.css'

function MaleSymbol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="14" r="6" />
        <line x1="14" y1="10" x2="22" y2="2" />
        <polyline points="18.5 2 22 2 22 5.5" />
      </g>
    </svg>
  )
}

function FemaleSymbol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9.5" r="6" />
        <line x1="12" y1="15.5" x2="12" y2="22" />
        <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" />
      </g>
    </svg>
  )
}

export default function Gender() {
  const { user, profile, refreshProfile } = useAuth()
  const [sel, setSel] = useState<'male' | 'female' | ''>(profile?.gender ?? '')
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  const canContinue = useMemo(() => !!sel && !saving, [sel, saving])

  const next = async () => {
    if (!user) {
      toast.error('Please sign in first.')
      return nav('/')
    }
    if (!sel) {
      toast.error('Please select a gender')
      return
    }
    try {
      setSaving(true)
      await setDoc(
        doc(db, 'users', user.uid),
        { uid: user.uid, gender: sel, isProfileComplete: false },
        { merge: true }
      )
      await refreshProfile()
      nav('/setup/profile', { replace: true })
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save gender')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="setup-wrap">
        <div className="setup-top">
          <button className="setup-back" onClick={() => nav(-1)} aria-label="Back">←</button>
          <div className="setup-progress">
            <div className="setup-progress-bar" style={{ width: '0%' }} />
          </div>
          <span className="setup-step">1/4</span>
        </div>

        <div className="container narrow">
          <section className="setup-card" role="group" aria-labelledby="gender-step">
            <h1 id="gender-step" className="setup-title">What’s your gender?</h1>
            <p className="setup-sub">Tell us about your gender.</p>

            <div className="gender-grid">
              <button
                className={`gender-pill gender-pill--male ${sel === 'male' ? 'is-selected' : ''}`}
                onClick={() => setSel('male')}
                aria-pressed={sel === 'male'}
              >
                <span className="gender-icon" aria-hidden="true">
                  <MaleSymbol />
                </span>
                <span className="gender-label">Male</span>
              </button>

              <button
                className={`gender-pill gender-pill--female ${sel === 'female' ? 'is-selected' : ''}`}
                onClick={() => setSel('female')}
                aria-pressed={sel === 'female'}
              >
                <span className="gender-icon" aria-hidden="true">
                  <FemaleSymbol />
                </span>
                <span className="gender-label">Female</span>
              </button>
            </div>

            <div className="setup-footer" style={{ marginTop: 12 }}>
              <button className="btn-primary-lg" onClick={next} disabled={!canContinue}>
                {saving ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}