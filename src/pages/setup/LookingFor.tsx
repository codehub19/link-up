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
  const [sel, setSel] = useState<'men' | 'women' | 'everyone'>(profile?.datingPreference || 'everyone')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfileAndStatus(
        user.uid,
        { datingPreference: sel },
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