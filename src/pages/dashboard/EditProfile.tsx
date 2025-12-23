import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db, uploadProfilePhoto } from '../../firebase'
import { toast } from 'sonner'
import AvatarUpload from '../../components/AvatarUpload'
import InterestsSelect from '../../components/InterestsSelect'
import CollegeSelect from '../../components/CollegeSelect'
import { useNavigate } from 'react-router-dom'
import { compressImage } from '../../utils/compressImage'
import LoadingSpinner from '../../components/LoadingSpinner'
import PhoneVerification from '../../components/PhoneVerification'
import './dashboard.css'

type PhotoSlot = { id: number; url?: string; file?: File | null }
const MAX_PHOTOS = 4

const COM = [
  { value: 'extremely', label: 'A. Extremely important—must be an excellent communicator.' },
  { value: 'very', label: 'B. Very important—I need open, honest discussion.' },
  { value: 'moderate', label: 'C. Moderately important—I can work with most styles.' },
  { value: 'low', label: 'D. Not a huge priority; actions speak louder.' },
]
const CONFLICT = [
  { value: 'address_immediately', label: 'A. Discuss it immediately and resolve quickly.' },
  { value: 'cool_down', label: 'B. Need time to cool down first.' },
  { value: 'wait_other', label: 'C. Wait for the other person to initiate.' },
  { value: 'avoid', label: 'D. Avoid conflict / keep peace.' },
]
const SUNDAY = [
  { value: 'relax_brunch', label: 'A. Sleeping in, late brunch, relaxing.' },
  { value: 'active_fitness', label: 'B. Gym / run / active outing.' },
  { value: 'personal_project', label: 'C. Personal project or learning.' },
  { value: 'social_family', label: 'D. Time with family or friends.' },
]
const TRAVEL = [
  { value: 'relaxing_resort', label: 'A. Relaxing beach / resort getaway.' },
  { value: 'explore_city', label: 'B. Backpacking / exploring a new city.' },
  { value: 'active_adventure', label: 'C. Active trip (hiking / skiing / camping).' },
  { value: 'visit_family', label: 'D. Visiting family or friends.' },
]
const LOVE = [
  { value: 'words', label: 'A. Words of Affirmation' },
  { value: 'quality_time', label: 'B. Quality Time' },
  { value: 'acts', label: 'C. Acts of Service' },
  { value: 'touch', label: 'D. Physical Touch' },
  { value: 'gifts', label: 'E. Receiving Gifts' },
]

export default function EditProfile() {
  const { loading, user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  // Profile field states
  const [name, setName] = useState(profile?.name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [saving, setSaving] = useState(false)
  const [insta, setInsta] = useState(profile?.instagramId ?? '')
  const [height, setHeight] = useState(profile?.height ?? '')
  const [college, setCollege] = useState(profile?.college ?? '')
  const [loveLanguage, setLoveLanguage] = useState(profile?.loveLanguage ?? '')
  const [travelPreference, setTravelPreference] = useState(profile?.travelPreference ?? '')
  const [sundayStyle, setSundayStyle] = useState(profile?.sundayStyle ?? '')
  const [communicationImportance, setCommunicationImportance] = useState(profile?.communicationImportance ?? '')
  const [conflictApproach, setConflictApproach] = useState(profile?.conflictApproach ?? '')
  const [verified, setVerified] = useState(profile?.verified ?? false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(profile?.isPhoneVerified ?? false)

  // 4 photo slots logic
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(() => {
    const urls = profile?.photoUrls ?? (profile?.photoUrl ? [profile.photoUrl] : [])
    return Array.from({ length: MAX_PHOTOS }, (_, i) => ({
      id: i,
      url: urls[i] || '',
      file: null,
    }))
  })
  const [isCompressing, setIsCompressing] = useState<boolean[]>(Array(MAX_PHOTOS).fill(false))

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setBio(profile.bio ?? '')
      setInterests(profile.interests ?? [])
      setInsta(profile.instagramId ?? '')
      setHeight(profile.height ?? '')
      setCollege(profile.college ?? '')
      setLoveLanguage(profile.loveLanguage ?? '')
      setTravelPreference(profile.travelPreference ?? '')
      setSundayStyle(profile.sundayStyle ?? '')
      setCommunicationImportance(profile.communicationImportance ?? '')
      setConflictApproach(profile.conflictApproach ?? '')
      setVerified(profile.verified ?? false)
      setIsPhoneVerified(profile.isPhoneVerified ?? false)
      const urls = profile?.photoUrls ?? (profile?.photoUrl ? [profile.photoUrl] : [])
      setPhotoSlots(
        Array.from({ length: MAX_PHOTOS }, (_, i) => ({
          id: i,
          url: urls[i] || '',
          file: null,
        }))
      )
    }
  }, [profile])

  // Pick photo for a slot (instant preview, compress, upload)
  const pick = (i: number) => {
    const input = inputRef.current
    if (!input) return
    input.onchange = async (e: any) => {
      const f = e.target.files?.[0]
      if (f) {
        const previewUrl = URL.createObjectURL(f)
        setIsCompressing(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
        try {
          if (!user) return
          const compressed = await compressImage(f)
          setPhotoSlots(prev => prev.map(s => s.id === i ? { ...s, url: previewUrl, file: compressed } : s))
          // Optionally, uploadProfilePhoto(user.uid, compressed, i) here only for instant preview upload.
        } finally {
          setIsCompressing(prev => {
            const next = [...prev]
            next[i] = false
            return next
          })
        }
      }
      e.target.value = ''
    }
    input.click()
  }
  const filledCount = photoSlots.filter((s) => s.file || s.url).length

  const removePhoto = (idx: number) => {
    setPhotoSlots(prev => prev.map((slot, i) => (i === idx ? { ...slot, file: null, url: '' } : slot)))
  }

  const save = async () => {
    if (!user) return
    if (filledCount === 0) {
      toast.error('Please upload at least one photo.')
      return
    }
    try {
      setSaving(true)
      // Upload all photos, get URLs
      const urls: string[] = []
      for (let i = 0; i < photoSlots.length; i++) {
        const slot = photoSlots[i]
        if (slot.file) {
          const url = await uploadProfilePhoto(user.uid, slot.file, i)
          urls.push(url)
        } else if (slot.url) {
          urls.push(slot.url)
        }
      }
      const filteredUrls = urls.filter(Boolean)
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        instagramId: insta.replace(/^@/, '').trim(),
        bio: bio.trim(),
        interests,
        photoUrl: filteredUrls[0], // first photo as main
        photoUrls: filteredUrls,
        height,
        college,
        loveLanguage,
        travelPreference,
        sundayStyle,
        communicationImportance,
        conflictApproach,
      })
      await refreshProfile()
      toast.success('Profile updated')
      nav(`/dashboard/${profile?.gender}/profile`)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const radioGroup = (title: string, cur: string, set: (v: string) => void, opts: any[], groupKey: string) => (
    <fieldset className="qa-group" key={groupKey}>
      <legend>{title}</legend>
      {opts.map(o => (
        <label key={o.value} className={`qa-option ${cur === o.value ? 'on' : ''}`}>
          <input type="radio" value={o.value} checked={cur === o.value} onChange={() => set(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )

  if (loading)
    return (
      <div className="loading-page-wrapper">
        <LoadingSpinner />
      </div>
    )

  return (
    <>
      <Navbar />
      <div className="container edit-profile-container">
        <button className="edit-profile-back-btn" onClick={() => nav(`/dashboard/${profile?.gender}/profile`)}>
          ← Back to Profile
        </button>
        <div className="edit-profile-hero">
          <input ref={inputRef} type="file" accept="image/*" hidden />
          <div className="edit-profile-photos-area">
            <div className="edit-profile-photos-grid">
              {photoSlots.map((slot, idx) => (
                <div key={slot.id} className={`edit-profile-photo-slot ${slot.url ? 'has-image' : ''}`}>
                  <div className="edit-profile-photo-inner">
                    {isCompressing[idx] ? (
                      <div style={{ textAlign: 'center', color: '#ff5d7c' }}>
                        <LoadingSpinner color='#ff5d7c' />
                      </div>
                    ) : slot.url ? (
                      <>
                        <img src={slot.url} alt={`Photo ${idx + 1}`} className="edit-profile-img" />
                        <button
                          className="photo-remove"
                          aria-label="Remove"
                          onClick={() => removePhoto(idx)}
                          disabled={saving}
                        >✕</button>
                      </>
                    ) : (
                      <button
                        className="photo-add"
                        onClick={() => pick(idx)}
                        aria-label="Add photo"
                        disabled={isCompressing.some(Boolean)}
                      >
                        <span style={{ fontSize: "2rem" }}>+</span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: 7, color: "#ff5d7c" }}>Add</span>
                      </button>
                    )}
                  </div>
                  {idx === 0 && (
                    <span className="edit-profile-primary-label">Primary</span>
                  )}
                </div>
              ))}
            </div>
            <div className="edit-profile-photos-caption">
              <span>Add up to 4 photos. First chosen becomes primary.</span>
            </div>
          </div>
          <div className="edit-profile-user-details">
            <div className="edit-profile-main-row">
              <span className="edit-profile-main-name">{name || 'Your Name'}</span>
              {verified && (
                <span className="edit-profile-verified" title="Verified">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="10" fill="#2196F3" />
                    <path
                      d="M7.7 11.8l2.1 2.1 4.1-4.1"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="11" cy="11" r="9.2" stroke="#fff" strokeWidth="1.2" fill="none" />
                  </svg>
                </span>
              )}
            </div>
            <div className="edit-profile-main-instagram">
              {insta ? <span>@{insta.replace(/^@/, '')}</span> : <span style={{ color: '#9aa0b4' }}>Instagram not linked</span>}
            </div>

            {/* Phone Verification Status */}
            <div style={{ marginTop: 12 }}>
              {isPhoneVerified ? (
                <div className="tag" style={{ background: '#e6fffa', color: '#009688', border: '1px solid #b2dfdb' }}>
                  ✓ Phone Verified
                </div>
              ) : (
                <div className="tag" style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' }}>
                  ⚠ Phone Not Verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phone Verification Section for Unverified Users */}
        {!isPhoneVerified && (
          <div style={{ marginBottom: 24 }}>
            <PhoneVerification onVerified={() => setIsPhoneVerified(true)} />
          </div>
        )}

        <form className="edit-profile-form-section" onSubmit={e => { e.preventDefault(); save(); }}>
          <label className="field">
            <span className="field-label">Full Name</span>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="field">
            <span className="field-label">Instagram</span>
            <div className="ig-field">
              <span>@</span>
              <input
                value={insta.replace(/^@/, '')}
                onChange={(e) => setInsta(e.target.value)}
                placeholder="yourhandle"
              />
            </div>
          </label>
          <label className="field">
            <span className="field-label">About Me</span>
            <textarea
              className="field-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio"
              rows={3}
            />
          </label>
          <div className="field">
            <span className="field-label">Interests</span>
            <div className="interests-wrap">
              <InterestsSelect value={interests} onChange={setInterests} />
              <small style={{ color: '#9aa0b4' }}>Pick up to 5 that describe you best</small>
            </div>
          </div>
          {radioGroup('Communication Importance', communicationImportance, setCommunicationImportance, COM, 'com')}
          {radioGroup('Conflict Style', conflictApproach, setConflictApproach, CONFLICT, 'conflict')}
          {radioGroup('Ideal Sunday', sundayStyle, setSundayStyle, SUNDAY, 'sunday')}
          {radioGroup('Travel Preference', travelPreference, setTravelPreference, TRAVEL, 'travel')}
          {radioGroup('Love Language', loveLanguage, setLoveLanguage, LOVE, 'love')}
          <label className="field">
            <span className="field-label">Height</span>
            <input
              className="field-input"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Your height"
            />
          </label>
          <label className="field">
            <span className="field-label">College</span>
            <CollegeSelect
              value={college}
              onChange={setCollege}
              placeholder="Search your college"
            />
          </label>
          <div className="save-row">
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                if (!profile) return
                setName(profile.name ?? '')
                setBio(profile.bio ?? '')
                setInterests(profile.interests ?? [])
                setInsta(profile.instagramId ?? '')
                setHeight(profile.height ?? '')
                setCollege(profile.college ?? '')
                setLoveLanguage(profile.loveLanguage ?? '')
                setTravelPreference(profile.travelPreference ?? '')
                setSundayStyle(profile.sundayStyle ?? '')
                setCommunicationImportance(profile.communicationImportance ?? '')
                setConflictApproach(profile.conflictApproach ?? '')
                setVerified(profile.verified ?? false)
                setIsPhoneVerified(profile.isPhoneVerified ?? false)
                const urls = profile?.photoUrls ?? (profile?.photoUrl ? [profile.photoUrl] : [])
                setPhotoSlots(
                  Array.from({ length: MAX_PHOTOS }, (_, i) => ({
                    id: i,
                    url: urls[i] || '',
                    file: null,
                  }))
                )
              }}
              disabled={saving}
            >
              Reset
            </button>
            <button className="btn-gradient" type="submit" disabled={saving}>
              {saving ? <LoadingSpinner /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      {/* <style>{`
        
      `}</style> */}
    </>
  )
}