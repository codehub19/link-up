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

type PhotoSlot = { id: number; url?: string; file?: File | null }
const MAX_PHOTOS = 4

const COM = [
  { value:'extremely', label:'A. Extremely important—must be an excellent communicator.' },
  { value:'very', label:'B. Very important—I need open, honest discussion.' },
  { value:'moderate', label:'C. Moderately important—I can work with most styles.' },
  { value:'low', label:'D. Not a huge priority; actions speak louder.' },
]
const CONFLICT = [
  { value:'address_immediately', label:'A. Discuss it immediately and resolve quickly.' },
  { value:'cool_down', label:'B. Need time to cool down first.' },
  { value:'wait_other', label:'C. Wait for the other person to initiate.' },
  { value:'avoid', label:'D. Avoid conflict / keep peace.' },
]
const SUNDAY = [
  { value:'relax_brunch', label:'A. Sleeping in, late brunch, relaxing.' },
  { value:'active_fitness', label:'B. Gym / run / active outing.' },
  { value:'personal_project', label:'C. Personal project or learning.' },
  { value:'social_family', label:'D. Time with family or friends.' },
]
const TRAVEL = [
  { value:'relaxing_resort', label:'A. Relaxing beach / resort getaway.' },
  { value:'explore_city', label:'B. Backpacking / exploring a new city.' },
  { value:'active_adventure', label:'C. Active trip (hiking / skiing / camping).' },
  { value:'visit_family', label:'D. Visiting family or friends.' },
]
const LOVE = [
  { value:'words', label:'A. Words of Affirmation' },
  { value:'quality_time', label:'B. Quality Time' },
  { value:'acts', label:'C. Acts of Service' },
  { value:'touch', label:'D. Physical Touch' },
  { value:'gifts', label:'E. Receiving Gifts' },
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
        setPhotoSlots(prev => prev.map(s => s.id === i ? { ...s, url: previewUrl, file: f } : s))
        setIsCompressing(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
        try {
          if (!user) return
          const compressed = await compressImage(f)
          await uploadProfilePhoto(user.uid, compressed, i)
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
      nav('/dashboard/profile')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const radioGroup = (title: string, cur: string, set: (v:string)=>void, opts: any[], groupKey: string) => (
    <fieldset className="qa-group" key={groupKey}>
      <legend>{title}</legend>
      {opts.map(o=>(
        <label key={o.value} className={`qa-option ${cur===o.value?'on':''}`}>
          <input type="radio" value={o.value} checked={cur===o.value} onChange={()=>set(o.value)} />
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
        <button className="edit-profile-back-btn" onClick={() => nav('/dashboard/profile')}>
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
                        <span style={{fontSize: "2rem"}}>+</span>
                        <span style={{fontSize: "0.95rem", fontWeight: 600, marginTop: 7, color: "#ff5d7c"}}>Add</span>
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
                    <circle cx="11" cy="11" r="9.2" stroke="#fff" strokeWidth="1.2" fill="none"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="edit-profile-main-instagram">
              {insta ? <span>@{insta.replace(/^@/, '')}</span> : <span style={{color: '#9aa0b4'}}>Instagram not linked</span>}
            </div>
          </div>
        </div>

        <form className="edit-profile-form-section" onSubmit={e => {e.preventDefault(); save();}}>
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
              placeholder="Search your college (Delhi NCR)"
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
      <style>{`
        .edit-profile-back-btn {
          background: none;
          color: #ff5d7c;
          border: none;
          font-weight: 700;
          font-size: 1.08rem;
          margin-bottom: 18px;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0 0 3px 0;
        }
        .edit-profile-back-btn:hover {
          color: #ea3d3d;
          text-decoration: underline;
        }
        .edit-profile-container {
          max-width: 590px;
          margin: 0 auto;
        }
        .edit-profile-hero {
          background: linear-gradient(120deg, #181923 90%, #1f1d2c 100%);
          border-radius: 20px;
          padding: 34px 20px 30px 20px;
          margin-bottom: 34px;
          box-shadow: 0 2px 22px 0 #18192355;
          display: flex;
          align-items: flex-start;
          flex-direction: column;
        }
        .edit-profile-photos-area {
          width: 100%;
          margin-bottom: 10px;
        }
        .edit-profile-photos-grid {
          display: flex;
          gap: 28px;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .edit-profile-photo-slot {
          background: #232a38;
          border-radius: 19px;
          width: 108px;
          height: 108px;
          min-width: 88px;
          min-height: 88px;
          max-width: 128px;
          max-height: 128px;
          box-shadow: 0 2px 16px 0 #232a3870;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border 0.2s;
          border: 2.2px solid #232a38;
        }
        .edit-profile-photo-slot.has-image {
          border: 2.2px solid #ff5d7c;
        }
        .edit-profile-photo-inner {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .edit-profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px;
        }
        .photo-remove {
          position: absolute;
          top: 7px;
          right: 7px;
          background: rgba(30,26,54,0.7);
          color: #ff5d7c;
          border: none;
          font-size: 1.14rem;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 2;
        }
        .photo-remove:hover:not(:disabled) {
          background: #ff5d7c;
          color: #fff;
        }
        .photo-add {
          width: 100%;
          height: 100%;
          background: #232a38;
          border-radius: 16px;
          border: 2.6px dashed #ff5d7c;
          color: #ff5d7c;
          font-size: 2.2rem;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .photo-add:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .edit-profile-primary-label {
          position: absolute;
          left: 50%;
          bottom: -15px;
          transform: translateX(-50%);
          background: #232a38;
          color: #ff5d7c;
          font-size: 0.92rem;
          font-weight: 600;
          border-radius: 11px;
          padding: 2px 14px;
          box-shadow: 0 1px 6px #232a3860;
        }
        .edit-profile-photos-caption {
          text-align: left;
          color: #9aa0b4;
          font-size: 0.97rem;
          margin-top: 8px;
        }
        .edit-profile-user-details {
          margin-top: 17px;
          width: 100%;
        }
        .edit-profile-main-row {
          font-size: 1.32rem;
          font-weight: bold;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
        }
        .edit-profile-verified {
          display: flex;
          align-items: center;
        }
        .edit-profile-main-instagram {
          color: #ff5d7c;
          font-size: 1.03rem;
          font-weight: 600;
        }
        .edit-profile-form-section {
          background: #181923;
          border-radius: 14px;
          padding: 24px 20px 18px 20px;
          margin-bottom: 34px;
          box-shadow: 0 2px 22px 0 #18192338;
        }
        .field {
          margin-bottom: 18px;
        }
        .field-label {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 6px;
          display: block;
          color: #ff5d7c;
        }
        .field-input, .field-textarea {
          width: 100%;
          padding: 11px 15px;
          border-radius: 7px;
          border: none;
          background: #232a38;
          color: #fff;
          font-size: 1.06rem;
          margin-top: 2px;
        }
        .field-textarea {
          resize: vertical;
        }
        .ig-field {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .interests-wrap {
          margin-top: 6px;
        }
        .qa-group {
          border: none;
          margin-bottom: 18px;
          margin-top: 14px;
        }
        .qa-group legend {
          font-size: 1.08rem;
          color: #ff5d7c;
          font-weight: bold;
          margin-bottom: 7px;
        }
        .qa-option {
          display: flex;
          align-items: center;
          background: #232a38;
          border-radius: 7px;
          padding: 8px 13px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          font-size: 0.97rem;
          color: #eaeaea;
          border: 2px solid transparent;
        }
        .qa-option.on,
        .qa-option:hover {
          background: #ff5d7c22;
          border: 2px solid #ff5d7c;
          color: #ff5d7c;
        }
        .qa-option input[type="radio"] {
          margin-right: 11px;
          accent-color: #ff5d7c;
        }
        .save-row {
          display: flex;
          gap: 18px;
          justify-content: flex-end;
          margin-top: 22px;
        }
        .btn-ghost {
          background: #232a38;
          color: #ff5d7c;
          border: none;
          border-radius: 8px;
          padding: 10px 26px;
          font-size: 1.07rem;
          cursor: pointer;
          font-weight: 700;
          transition: background 0.2s, color 0.2s;
        }
        .btn-ghost:hover {
          background: #ff5d7c;
          color: #fff;
        }
        .btn-gradient {
          background: linear-gradient(90deg, #ff5d7c, #ea3d3d 80%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 34px;
          font-size: 1.13rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-gradient:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 650px) {
          .edit-profile-container {
            max-width: 99vw;
            padding: 8px 2vw;
          }
          .edit-profile-hero {
            padding: 22px 6vw 18px 6vw;
            margin-bottom: 18px;
          }
          .edit-profile-photos-grid {
            gap: 12px;
            justify-content: center;
          }
          .edit-profile-photo-slot {
            width: 34vw;
            height: 34vw;
            min-width: 80px;
            min-height: 80px;
            max-width: 120px;
            max-height: 120px;
          }
          .edit-profile-photo-inner {
            border-radius: 11px;
          }
          .edit-profile-img {
            border-radius: 11px;
          }
          .edit-profile-primary-label {
            font-size: 0.81rem;
            padding: 2px 9vw;
            bottom: -9px;
          }
          .edit-profile-user-details {
            margin-top: 11px;
          }
          .edit-profile-main-row {
            font-size: 1.08rem;
            margin-bottom: 5px;
          }
          .edit-profile-main-instagram {
            font-size: 0.98rem;
          }
          .edit-profile-form-section {
            padding: 14px 4vw 12px 4vw;
            margin-bottom: 20px;
          }
          .qa-group legend {
            font-size: 1rem;
          }
          .qa-option {
            padding: 7px 7px;
            font-size: 0.93rem;
          }
        }
      `}</style>
    </>
  )
}