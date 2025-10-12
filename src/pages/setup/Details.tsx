import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import CollegeSelect from '../../components/CollegeSelect'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

export default function Details({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState(profile?.name || '')
  const [insta, setInsta] = useState(profile?.instagramId || '')
  const [college, setCollege] = useState(profile?.college || '')
  const [dob, setDob] = useState(profile?.dob || '')
  const [saving, setSaving] = useState(false)
  const valid = name.trim() && college && dob

  const save = async () => {
    if (!user || !valid) return
    setSaving(true)
    try {
      await updateProfileAndStatus(user.uid, {
        name: name.trim(),
        instagramId: insta.replace(/^@/, '').trim(),
        college,
        dob,
      }, { profile: true })
      await refreshProfile()
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/setup/interests')
      }
    } finally {
      setSaving(false)
    }
  }

  const today = new Date()
  const year = today.getFullYear() - 18
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const maxDate = `${year}-${month}-${day}`

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Profile Details</h1>
          <p className="setup-sub">Finish the basics. DOB stays private.</p>
          <div className="details-form">
            <label className="field">
              <span className="field-label">First name</span>
              <input className="field-input" value={name} onChange={e=>setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Instagram</span>
              <div className="ig-field">
                <span>@</span>
                <input className="field-input" value={insta.replace(/^@/,'')} onChange={e=>setInsta(e.target.value)} placeholder="yourhandle" />
              </div>
            </label>
            <label className="field">
              <span className="field-label">College</span>
              <CollegeSelect value={college} onChange={setCollege} placeholder="Search your college (Delhi NCR)" />
            </label>
            <label className="field">
              <span className="field-label">Date of Birth</span>
              <input
                id="dob"
                type="date"
                className="field-input"
                value={dob}
                onChange={e => setDob(e.target.value)}
                max={maxDate}  // ✅ Restrict to 18+ users
                required
              />
              {dob && new Date(dob) > new Date(maxDate) && (
                <p style={{ color: 'red', marginTop: 8 }}>
                  You must be at least 18 years old to continue.
                </p>
              )}
            </label>
          </div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!valid || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}