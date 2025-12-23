import React, { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import { updateProfileAndStatus, nextSetupRoute } from '../../firebase'
import CollegeSelect from '../../components/CollegeSelect'
import PhoneVerification from '../../components/PhoneVerification'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }

export default function Details({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState(profile?.name || '')
  const [insta, setInsta] = useState(profile?.instagramId || '')
  const [college, setCollege] = useState(profile?.college || '')
  const [dob, setDob] = useState(profile?.dob || '')

  // New Fields
  const [userType, setUserType] = useState<'college' | 'general'>(
    profile?.userType || 'college'
  )
  const [datingPreference, setDatingPreference] = useState<'college_only' | 'open_to_all'>(
    profile?.datingPreference || 'college_only'
  )

  const [isPhoneVerified, setIsPhoneVerified] = useState(false)

  useEffect(() => {
    if (profile?.isPhoneVerified) {
      setIsPhoneVerified(true)
    }
  }, [profile])

  const [saving, setSaving] = useState(false)

  // Validation
  const isCollegeUser = userType === 'college'
  const validName = !!name.trim()
  const validInsta = !!insta.trim()
  const validDob = !!dob
  const validCollege = isCollegeUser ? !!college : true

  const valid = validName && validInsta && validDob && validCollege && isPhoneVerified

  const save = async () => {
    if (!user || !valid) return
    setSaving(true)
    try {
      // If general user, force dating preference to open_to_all
      const finalPreference = userType === 'general' ? 'open_to_all' : datingPreference

      await updateProfileAndStatus(user.uid, {
        name: name.trim(),
        instagramId: insta.replace(/^@/, '').trim(),
        college: isCollegeUser ? college : null, // Clear college if general
        dob,
        userType,
        datingPreference: finalPreference,
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
          <p className="setup-sub">Tell us a bit about yourself.</p>

          <div className="details-form">

            {/* User Type Selection */}
            <div className="field">
              <span className="field-label">I am a...</span>
              <div className="row" style={{ gap: 12 }}>
                <button
                  className={`btn ${userType === 'college' ? 'primary' : 'ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setUserType('college')}
                >
                  Student
                </button>
                <button
                  className={`btn ${userType === 'general' ? 'primary' : 'ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setUserType('general')}
                >
                  Working / Other
                </button>
              </div>
            </div>

            <label className="field">
              <span className="field-label">Full name</span>
              <input className="field-input" value={name} onChange={e => setName(e.target.value)} />
            </label>

            <label className="field">
              <span className="field-label">
                Instagram <span style={{ color: 'red' }}>*</span>
              </span>
              <div className="ig-field">
                <span>@</span>
                <input
                  className="field-input"
                  value={insta.replace(/^@/, '')}
                  onChange={e => setInsta(e.target.value)}
                  placeholder="yourhandle"
                  required
                />
              </div>
              {!insta.trim() && (
                <span style={{ color: 'red', fontSize: 13 }}>
                  Instagram handle is required
                </span>
              )}
            </label>

            {/* College Field - Only for Students */}
            {isCollegeUser && (
              <label className="field">
                <span className="field-label">College</span>
                <CollegeSelect value={college} onChange={setCollege} placeholder="Search your college" />
              </label>
            )}

            {/* Dating Preference - Only for Students */}
            {isCollegeUser && (
              <div className="field">
                <span className="field-label">Who would you like to date?</span>
                <div className="row" style={{ gap: 12 }}>
                  <button
                    className={`btn ${datingPreference === 'college_only' ? 'primary' : 'ghost'}`}
                    style={{ flex: 1, fontSize: 13 }}
                    onClick={() => setDatingPreference('college_only')}
                  >
                    College Students Only
                  </button>
                  <button
                    className={`btn ${datingPreference === 'open_to_all' ? 'primary' : 'ghost'}`}
                    style={{ flex: 1, fontSize: 13 }}
                    onClick={() => setDatingPreference('open_to_all')}
                  >
                    Open to Everyone
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  {datingPreference === 'college_only'
                    ? "You will only be matched with other verified college students."
                    : "You may be matched with students or working professionals."}
                </p>
              </div>
            )}

            <label className="field">
              <span className="field-label">Date of Birth</span>
              <input
                id="dob"
                type="date"
                className="field-input"
                value={dob}
                onChange={e => setDob(e.target.value)}
                max={maxDate}
                required
              />
              {dob && new Date(dob) > new Date(maxDate) && (
                <p style={{ color: 'red', marginTop: 8 }}>
                  You must be at least 18 years old to continue.
                </p>
              )}
            </label>

            {/* Phone Verification */}
            <div className="field">
              <span className="field-label">Mobile Verification <span style={{ color: 'red' }}>*</span></span>
              {isPhoneVerified ? (
                <div className="tag" style={{ background: '#e6fffa', color: '#009688', border: '1px solid #b2dfdb', padding: '8px 12px', display: 'inline-block' }}>
                  ✓ Phone Verified
                </div>
              ) : (
                <PhoneVerification onVerified={() => setIsPhoneVerified(true)} />
              )}
            </div>

          </div>

          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!valid || saving} onClick={save}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
            {!isPhoneVerified && <p style={{ fontSize: 12, color: 'red', marginTop: 8 }}>Please verify your phone number to continue.</p>}
          </div>
        </section>
      </div>
    </>
  )
}