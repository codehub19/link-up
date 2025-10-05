import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

export default function Gender({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const [sel, setSel] = useState<'male' | 'female' | ''>(profile?.gender ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user || !sel) return
    setSaving(true)
    try {
      await updateProfileAndStatus(
        user.uid,
        { gender: sel },
        { gender: true }
      )
      await refreshProfile()
      if (embedded && onComplete) onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Your Gender</h1>
          <p className="setup-sub">Select one to continue.</p>
          <div className="gender-grid">
            <button className={`gender-pill ${sel==='male'?'is-selected':''}`} onClick={()=>setSel('male')}>
              <span className="gender-label">Male</span>
            </button>
            <button className={`gender-pill ${sel==='female'?'is-selected':''}`} onClick={()=>setSel('female')}>
              <span className="gender-label">Female</span>
            </button>
          </div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!sel || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}