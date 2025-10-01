import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import './setup.styles.css'

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
      // Persist gender and explicitly mark profile incomplete
      await setDoc(
        doc(db, 'users', user.uid),
        { uid: user.uid, gender: sel, isProfileComplete: false },
        { merge: true }
      )
      // Ensure local context sees the new gender before routing
      await refreshProfile()

      // Go to the multi-step profile setup
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
            <div className="setup-progress-bar" style={{ width: '25%' }} />
          </div>
          <span className="setup-step">1/4</span>
        </div>

        <div className="container narrow">
          <section className="setup-card" role="group" aria-labelledby="gender-step">
            <h1 id="gender-step" className="setup-title">What’s your gender?</h1>
            <p className="setup-sub">Tell us about your gender.</p>

            <div className="gender-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
              <button
                className={`gender-pill ${sel === 'male' ? 'is-selected' : ''}`}
                onClick={() => setSel('male')}
                aria-pressed={sel === 'male'}
              >
                <span>♂</span>
                <span>Male</span>
              </button>
              <button
                className={`gender-pill ${sel === 'female' ? 'is-selected' : ''}`}
                onClick={() => setSel('female')}
                aria-pressed={sel === 'female'}
              >
                <span>♀</span>
                <span>Female</span>
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