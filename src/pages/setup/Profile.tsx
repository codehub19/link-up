import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { saveUserProfile, uploadProfilePhoto } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import './setup.styles.css'
import CollegeSelect from '../../components/CollegeSelect'

// Colleges for dropdown
const COLLEGES: string[] = [
  'IIT Delhi',
  'Delhi University',
  'NSUT',
  'DTU',
  'IIIT Delhi',
  'IIM Rohtak',
  'Jamia Millia Islamia',
  'Shiv Nadar University',
  'Ashoka University',
  'IP University',
]

// Interest label -> icon id map
export const INTEREST_ICONS = {
  Photography: 'camera',
  Cooking: 'cook',
  Gaming: 'game',
  Music: 'music',
  Travel: 'travel',
  Painting: 'paint',
  Politics: 'policy',
  Charity: 'heart',
  Pets: 'pets',
  Sports: 'sport',
  Fashion: 'fashion',
  Startups: 'rocket',
  Fitness: 'fitness',
  Books: 'book',
  'Art & Crafts': 'craft',
} as const

type InterestLabel = keyof typeof INTEREST_ICONS
type IconId = typeof INTEREST_ICONS[InterestLabel]
export const INTERESTS: InterestLabel[] = Object.keys(INTEREST_ICONS) as InterestLabel[]

type PhotoSlot = { url?: string; file?: File }

function Icon({ id }: { id: IconId }) {
  return (
    <span className="icon">
      {(() => {
        switch (id) {
          case 'camera': return (
            <svg viewBox="0 0 24 24"><path d="M4 7h4l2-2h4l2 2h4v12H4V7z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          case 'cook': return (
            <svg viewBox="0 0 24 24"><path d="M7 4h10M6 8h12M8 12h8M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          case 'game': return (
            <svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13h-2m1-1v2M16.5 13.5h.01M18.5 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )
          case 'music': return (
            <svg viewBox="0 0 24 24"><path d="M9 18a3 3 0 1 0 0-6v6zm0-9l10-3v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/><circle cx="16" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          case 'travel': return (
            <svg viewBox="0 0 24 24"><path d="M3 12l18-6-6 18-3-7-7-3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )
          case 'paint': return (
            <svg viewBox="0 0 24 24"><path d="M12 3a8 8 0 0 0 0 16h2a2 2 0 0 1 0 4" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="10" cy="13" r="1"/></svg>
          )
          case 'policy': return (
            <svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 4.4-3.1 8.4-8 10-4.9-1.6-8-5.6-8-10V6l8-4z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )
          case 'heart': return (
            <svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          case 'pets': return (
            <svg viewBox="0 0 24 24"><circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><path d="M6 14c2-2 10-2 12 0-1 4-11 6-12 0z" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          case 'sport': return (
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="1.2" opacity=".6"/></svg>
          )
          case 'fashion': return (
            <svg viewBox="0 0 24 24"><path d="M4 18l4-10 4 4 4-4 4 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )
          case 'rocket': return (
            <svg viewBox="0 0 24 24"><path d="M12 2c4 2 6 6 6 10l-4 4c-4 0-8-2-10-6l4-4C6 4 10 2 12 2z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 17l-2 5 5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )
          case 'fitness': return (
            <svg viewBox="0 0 24 24"><path d="M5 8v8M9 6v12M15 6v12M19 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )
          case 'book': return (
            <svg viewBox="0 0 24 24"><path d="M4 5h10a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3V5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M17 8h3v11" stroke="currentColor" strokeWidth="1.8"/></svg>
          )
          default: return (
            <svg viewBox="0 0 24 24"><path d="M3 12l6 6 12-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )
        }
      })()}
    </span>
  )
}

function formatDobLabel(dob: string | null) {
  if (!dob) return 'Choose birthday date'
  try {
    const d = new Date(dob)
    const y = d.getFullYear()
    const m = d.toLocaleString('default', { month: 'short' })
    const day = String(d.getDate()).padStart(2, '0')
    return `${day} ${m} ${y}`
  } catch {
    return 'Choose birthday date'
  }
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()

  // New flow (4 steps in this wizard):
  // 0 = Details (no bio), 1 = Interests, 2 = Bio, 3 = Photos
  const [step, setStep] = useState<number>(0)

  // Step 1: Interests
  const [picked, setPicked] = useState<string[]>(profile?.interests ?? [])

  // Photos
  const [slots, setSlots] = useState<PhotoSlot[]>(() => Array.from({ length: 6 }, () => ({})))
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Details (no bio here)
  const [name, setName] = useState<string>(profile?.name ?? '')
  const [insta, setInsta] = useState<string>(profile?.instagramId ?? '')
  const [college, setCollege] = useState<string>(profile?.college ?? '')
  const [dob, setDob] = useState<string | null>(null)
  const [dobOpen, setDobOpen] = useState<boolean>(false)

  // Bio (separate page, requested after interests)
  const [bio, setBio] = useState<string>(profile?.bio ?? '')

  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (profile?.photoUrl) {
      setSlots((prev: PhotoSlot[]) => {
        const copy = [...prev]
        copy[0] = { url: profile.photoUrl }
        return copy
      })
    }
  }, [profile?.photoUrl])

  const toggleInterest = (t: string) => {
    setPicked((prev: string[]) => {
      if (prev.includes(t)) return prev.filter((x: string) => x !== t)
      if (prev.length >= 3) return prev
      return [...prev, t]
    })
  }

  const addPhotoAt = (index: number) => {
    const input = fileInputRef.current
    if (!input) return
    input.onchange = (e: any) => {
      const f = e.target.files?.[0]
      if (f) {
        const reader = new FileReader()
        reader.onload = () => {
          setSlots((prev: PhotoSlot[]) => {
            const copy = [...prev]
            copy[index] = { url: String(reader.result), file: f }
            return copy
          })
        }
        reader.readAsDataURL(f)
      }
      e.target.value = ''
    }
    input.click()
  }

  const removePhotoAt = (index: number) => {
    setSlots((prev: PhotoSlot[]) => {
      const copy = [...prev]
      copy[index] = {}
      return copy
    })
  }

  const canNext =
    step === 0 ? Boolean(name && insta && college && dob) :
    step === 1 ? picked.length > 0 && picked.length <= 3 :
    step === 2 ? Boolean(bio && bio.trim().length > 0) :
    step === 3 ? Boolean(slots.some((s: PhotoSlot) => s.file || s.url)) :
    false

  const back = () => {
    if (step > 0) setStep((s: number) => s - 1)
    else nav(-1)
  }

  const next = () => {
    if (!canNext) {
      toast.error('Please complete this step')
      return
    }
    if (step < 3) setStep((s: number) => s + 1)
  }

  const finish = async () => {
    if (!user || !profile?.gender) return
    if (!name || !insta || !college || !dob || picked.length === 0 || !bio || !slots.some((s: PhotoSlot) => s.file || s.url)) {
      return toast.error('Please complete all required fields')
    }

    try {
      setSubmitting(true)
      const primary = slots.find((s: PhotoSlot) => s.file) || null
      let photoUrl = profile.photoUrl

      if (primary?.file) {
        photoUrl = await uploadProfilePhoto(user.uid, primary.file)
      }

      await saveUserProfile(user.uid, {
        name,
        gender: profile.gender,
        instagramId: insta.replace(/^@/, ''),
        college,
        photoUrl: photoUrl!,
        bio,
        interests: picked,
        dob: dob || undefined,
      })
      await refreshProfile()
      toast.success('Profile saved')
      nav('/dashboard')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  const maxISO = new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().slice(0, 10)
  const minISO = new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().slice(0, 10)

  return (
    <>
      <Navbar />
      <div className="setup-wrap">
        <div className="setup-top">
          <button type="button" className="setup-back" onClick={back} aria-label="Back">←</button>
          <div className="setup-progress">
            <div className="setup-progress-bar" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
          <span className="setup-step">{step + 1}/4</span>
        </div>

        <div className="container narrow">
          {/* Step 0: Details (no bio) */}
          {step === 0 && (
            <section className="setup-card setup-card-glass" role="group" aria-labelledby="step-details-early">
              <div className="setup-head">
                <h1 id="step-details-early" className="setup-title">Profile details</h1>
                <p className="setup-sub">Finish up with the essentials. Your DOB stays private.</p>
              </div>

              <div className="setup-body">
                <div className="details-form">
                  <label className="field">
                    <span className="field-label">First name</span>
                    <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </label>

                  <label className="field">
                    <span className="field-label">Instagram ID</span>
                    <div className="ig-field">
                      <span>@</span>
                      <input className="field-input" value={insta.replace(/^@/, '')} onChange={(e) => setInsta(e.target.value)} placeholder="yourhandle" />
                    </div>
                  </label>

                  <label className="field">
                    <span className="field-label">College</span>
                    <CollegeSelect value={college} onChange={setCollege} placeholder="Search your college (Delhi NCR)" />
                  </label>
                  
                  <button type="button" className={`dob-field ${dob ? 'has-value' : ''}`} onClick={() => setDobOpen(true)}>
                    <span className="dob-icon">🎂</span>
                    <span>{formatDobLabel(dob)}</span>
                  </button>
                </div>
              </div>

              <div className="setup-card-footer">
                <button className="btn-primary-lg" onClick={next} disabled={!canNext}>Continue</button>
              </div>
            </section>
          )}

          {/* Step 1: Interests */}
          {step === 1 && (
            <section className="setup-card setup-card-glass" role="group" aria-labelledby="step-interests">
              <div className="setup-head">
                <h1 id="step-interests" className="setup-title">Select up to 3 interests</h1>
                <p className="setup-sub">Show what you’re into. Icons help the vibe.</p>
              </div>

              <div className="setup-body">
                <div className="chips-grid">
                  {INTERESTS.map((label: InterestLabel) => (
                    <button
                      key={label}
                      className={`chip-pill icon-pill ${picked.includes(label) ? 'is-selected' : ''}`}
                      onClick={() => toggleInterest(label)}
                    >
                      <Icon id={INTEREST_ICONS[label]} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="chips-count">{picked.length}/3 selected</div>
              </div>

              <div className="setup-card-footer">
                <div className="footer-row">
                  <button className="btn-ghost-lg" onClick={back}>Back</button>
                  <button className="btn-primary-lg" onClick={next} disabled={!canNext}>Continue</button>
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Bio (separate page after interests) */}
          {step === 2 && (
            <section className="setup-card setup-card-glass" role="group" aria-labelledby="step-bio">
              <div className="setup-head">
                <h1 id="step-bio" className="setup-title">Your bio</h1>
                <p className="setup-sub">Tell others a bit about yourself (max 250 characters).</p>
              </div>

              <div className="setup-body">
                <label className="field">
                  <span className="field-label">Bio</span>
                  <textarea
                    className="field-input"
                    maxLength={250}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself (max 250 chars)"
                    rows={6}
                  />
                </label>
              </div>

              <div className="setup-card-footer">
                <div className="footer-row">
                  <button className="btn-ghost-lg" onClick={back}>Back</button>
                  <button className="btn-primary-lg" onClick={next} disabled={!canNext}>Continue</button>
                </div>
              </div>
            </section>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <section className="setup-card setup-card-glass" role="group" aria-labelledby="step-photos">
              <div className="setup-head">
                <h1 id="step-photos" className="setup-title">Upload your photos</h1>
                <p className="setup-sub">Add up to 6. The first filled slot becomes your primary photo.</p>
              </div>

              <div className="setup-body">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                <div className="photo-grid">
                  {slots.map((s: PhotoSlot, i: number) => (
                    <div key={i} className={`photo-slot glossy ${s.url ? 'has-image' : ''}`}>
                      {s.url ? (
                        <>
                          <img src={s.url} alt={`Photo ${i + 1}`} />
                          <button className="photo-remove" onClick={() => removePhotoAt(i)} aria-label="Remove">✕</button>
                        </>
                      ) : (
                        <button className="photo-add" onClick={() => addPhotoAt(i)} aria-label="Add">+</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="setup-card-footer">
                <div className="footer-row">
                  <button className="btn-ghost-lg" onClick={back}>Back</button>
                  <button className="btn-primary-lg" onClick={finish} disabled={submitting || !canNext}>
                    {submitting ? 'Saving…' : 'Finish'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* DOB Bottom Sheet */}
      {dobOpen && (
        <div className="sheet-overlay" onClick={() => setDobOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 className="sheet-title">Birthday</h3>
            <div className="sheet-sub">{dob ? new Date(dob).getFullYear() : 'Choose date'}</div>
            <div className="sheet-body">
              <input
                className="date-input"
                type="date"
                value={dob ?? ''}
                onChange={(e) => setDob(e.target.value || null)}
                min={minISO}
                max={maxISO}
              />
              <div className="date-hint">You must be at least 16 years old.</div>
            </div>
            <div className="sheet-actions">
              <button className="btn-ghost-lg" onClick={() => setDobOpen(false)}>Cancel</button>
              <button className="btn-primary-lg" onClick={() => setDobOpen(false)} disabled={!dob}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}