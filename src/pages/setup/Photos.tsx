import React, { useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { uploadProfilePhoto, updateProfileAndStatus, finalizeIfComplete, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'
import { compressImage } from '../../utils/compressImage' // Add compression utility
import LoadingSpinner from '../../components/LoadingSpinner' // Add spinner
import AvatarEditor from '../../components/profile/AvatarEditor'
import { AvatarConfig, normalizeAvatar } from '../../utils/avatar'

type Slot = { id: number; url?: string; file?: File }
type Props = {
  embedded?: boolean
  onComplete?: () => void
  /** Dating: real photos only, no avatar option */
  photosOnly?: boolean
}

export default function Photos({ embedded, onComplete, photosOnly }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: 4 }, (_, i) => ({ id: i })))
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [isCompressing, setIsCompressing] = useState<boolean[]>(Array(4).fill(false)) // Add compression state
  // Friends doesn't need a photo: people can use an illustrated avatar instead
  const [mode, setMode] = useState<'photos' | 'avatar'>('photos')
  const [avatar, setAvatar] = useState<AvatarConfig>(() => normalizeAvatar((profile as any)?.avatar, user?.uid, profile?.gender))

  // Updated pick function for instant preview and async compress/upload
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
          setSlots(prev => prev.map(s => s.id === i ? { ...s, url: previewUrl, file: compressed } : s))
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

  const filled = slots.some(s => s.file)

  const finish = async () => {
    if (!user) return;
    // Get all slots with a file
    const files: File[] = slots.filter(s => s.file).map(s => s.file as File);
    if (files.length === 0) return; // Require at least one photo

    setSaving(true);
    try {
      // Upload all photos, get URLs
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadProfilePhoto(user.uid, files[i], i);
        urls.push(url);
      }
      // Save photoUrls array and first photo as photoUrl
      await updateProfileAndStatus(user.uid, {
        photoUrls: urls, // all uploaded photos
        photoUrl: urls[0], // first photo as profile photo
      }, { photos: true });

      await refreshProfile();
      await finalizeIfComplete(user.uid);

      if (embedded && onComplete) onComplete();
      else {
        const next = nextSetupRoute(profile);
        nav(next || '/dashboard');
      }
    } finally {
      setSaving(false);
    }
  }

  const finishWithAvatar = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfileAndStatus(user.uid, { avatar, photoUrl: null, photoUrls: [] } as any, { photos: true })
      await refreshProfile()
      await finalizeIfComplete(user.uid)
      if (embedded && onComplete) onComplete()
      else nav(nextSetupRoute(profile) || '/dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'avatar') {
    return (
      <>
        {!embedded && <Navbar />}
        <div className={embedded ? '' : 'setup-page'}>
          <section className="setup-card setup-card-glass">
            <h1 className="setup-title">Make your avatar</h1>
            <p className="setup-sub">Shown instead of a photo in Friends, Events and Groups. You can add photos any time — they’re needed only if you try dating.</p>
            <AvatarEditor value={avatar} onChange={setAvatar} gender={profile?.gender} />
            <div className="setup-card-footer" style={{ flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary-lg" disabled={saving} onClick={finishWithAvatar}>{saving ? <LoadingSpinner /> : 'Use this avatar'}</button>
              <button type="button" className="setup-link-btn" onClick={() => setMode('photos')}>Upload photos instead</button>
            </div>
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <input ref={inputRef} type="file" accept="image/*" hidden />
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">{photosOnly ? 'Add your photos' : 'Upload Photos'}</h1>
          <p className="setup-sub">{photosOnly
            ? 'Dating needs real photos of you — it keeps everyone genuine. Add at least one clear photo of your face. Photos are checked automatically.'
            : 'Add at least one. First chosen becomes primary. Not comfortable with a photo? Use an avatar — you’ll need real photos only for dating.'}</p>
          <div className="photo-grid">
            {slots.map((s, i) => (
              <div key={s.id} className={`photo-slot ${s.url ? 'has-image' : ''}`}>
                {isCompressing[i] ? (
                  <div style={{ textAlign: 'center', color: '#ff5d7c' }}>
                    <LoadingSpinner color='#ff5d7c' />
                  </div>
                ) : s.url ? (
                  <>
                    <img src={s.url} alt={`Photo ${i + 1}`} />
                    <button className="photo-remove" aria-label="Remove"
                      onClick={() => setSlots(prev => prev.map(p => p.id === s.id ? { id: p.id } : p))}
                    >✕</button>
                  </>
                ) : (
                  <button
                    className="photo-add"
                    onClick={() => pick(i)}
                    aria-label="Add photo"
                    disabled={isCompressing.some(Boolean)} // Disable during any compression
                  >+</button>
                )}
              </div>
            ))}
          </div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!filled || saving || isCompressing.some(Boolean)} onClick={finish}>
              {saving ? <LoadingSpinner /> : 'Finish'}
            </button>
            {!photosOnly && <button type="button" className="setup-link-btn" onClick={() => setMode('avatar')}>Use an avatar instead</button>}
          </div>
        </section>
      </div>
    </>
  )
}