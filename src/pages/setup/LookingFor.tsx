import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function LookingFor({ embedded, onComplete }: { embedded?: boolean; onComplete?: () => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  // Stored separately from datingPreference, which holds the "college students only / everyone" choice
  const [sel, setSel] = useState<'men' | 'women' | 'everyone'>((profile as any)?.interestedIn || 'everyone')
  const isCollege = !profile?.userType || profile.userType === 'college'
  const [pool, setPool] = useState<'college_only' | 'open_to_all'>(
    profile?.datingPreference === 'open_to_all' ? 'open_to_all' : 'college_only'
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfileAndStatus(
        user.uid,
        { interestedIn: sel, datingPreference: isCollege ? pool : 'open_to_all' } as any,
        { lookingFor: true } // Mark step as lookingFor (reusing this map key loosely or add new)
      )
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        nav('/setup/height')
      }
    } finally {
      setSaving(false)
    }
  }

  const Option = ({ val, label }: { val: 'men' | 'women' | 'everyone', label: string }) => (
    <button
      className={`qa-option ${sel === val ? 'on' : ''}`}
      onClick={() => setSel(val)}
      style={{ width: '100%', justifyContent: 'space-between' }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `2px solid ${sel === val ? '#e11d48' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {sel === val && <div style={{ width: 10, height: 10, background: '#e11d48', borderRadius: '50%' }} />}
      </div>
    </button>
  )

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card">
          <h1 className="setup-title">Interested In</h1>
          <p className="setup-sub">Who are you looking to match with?</p>

          <div className="qa-group">
            <Option val="women" label="Women" />
            <Option val="men" label="Men" />
            <Option val="everyone" label="Everyone" />
          </div>

          {isCollege && (
            <div className="field" style={{ marginTop: 18 }}>
              <span className="field-label">Match me with</span>
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className={`btn ${pool === 'college_only' ? 'primary' : 'ghost'}`} style={{ flex: 1, fontSize: 13 }} onClick={() => setPool('college_only')}>
                  College students only
                </button>
                <button type="button" className={`btn ${pool === 'open_to_all' ? 'primary' : 'ghost'}`} style={{ flex: 1, fontSize: 13 }} onClick={() => setPool('open_to_all')}>
                  Anyone
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                {pool === 'college_only'
                  ? 'You will only be matched with other college students.'
                  : 'You may be matched with students or working professionals.'}
              </p>
            </div>
          )}

          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={saving} onClick={save}>
              {saving ? <LoadingSpinner color="#fff" size={20} /> : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}