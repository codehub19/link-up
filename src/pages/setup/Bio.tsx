import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

export default function Bio({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!user || !bio.trim()) return
    setSaving(true)
    try {
      await updateProfileAndStatus(user.uid, { bio: bio.trim() }, { bio: true })
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/setup/photos')
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
          <h1 className="setup-title">Your Bio</h1>
          <p className="setup-sub">Max 250 characters.</p>
          <textarea
            className="bio-field"
            maxLength={250}
            value={bio}
            onChange={e=>setBio(e.target.value)}
            rows={6}
            placeholder="Share your vibe, passions, or a fun hook..."
          />
          <div style={{ textAlign:'right', fontSize:12, color:'#9aa0b4' }}>{bio.length}/250</div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!bio.trim() || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}