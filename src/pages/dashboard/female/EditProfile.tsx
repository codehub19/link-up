import React, { useEffect, useState } from 'react'
import Navbar from '../../../components/Navbar'
import FileUpload from '../../../components/FileUpload'
import { useAuth } from '../../../state/AuthContext'
import { toast } from 'sonner'
import { db, storage } from '../../../firebase'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Link } from 'react-router-dom'

type ProfileForm = {
  name: string
  instagramId: string
  bio: string
  interests: string
  photoUrl?: string
}

export default function EditProfile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    instagramId: '',
    bio: '',
    interests: '',
    photoUrl: undefined,
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Initialize form from current profile
  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name ?? '',
      instagramId: profile.instagramId ?? '',
      bio: profile.bio ?? '',
      interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : (profile.interests ?? ''),
      photoUrl: profile.photoUrl,
    })
  }, [profile])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleFile = (f: File) => setFile(f)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('You must be signed in.')
      return
    }
    if (!form.name.trim()) {
      toast.error('Please enter your name.')
      return
    }

    setSaving(true)
    try {
      let photoUrl = form.photoUrl

      // Upload new photo if selected
      if (file) {
        const objectRef = ref(storage, `users/${user.uid}/profile.jpg`)
        await uploadBytes(objectRef, file)
        photoUrl = await getDownloadURL(objectRef)
      }

      // Normalize interests: allow comma-separated string -> array of trimmed strings
      const interestsArray = form.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      // Save to Firestore (use uid as doc id; merges if exists)
      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          gender: profile?.gender ?? 'female',
          name: form.name.trim(),
          instagramId: form.instagramId.trim(),
          bio: form.bio.trim(),
          interests: interestsArray,
          photoUrl: photoUrl,
          updatedAt: new Date(),
        },
        { merge: true }
      )

      toast.success('Profile updated')
      setFile(null)
      setForm((f) => ({ ...f, photoUrl }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="container narrow">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Edit Profile</h2>
          <Link className="btn ghost" to="/dashboard/connections">Back</Link>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="stack">
              <label style={{ fontWeight: 600 }}>Photo</label>
              <FileUpload onFile={handleFile} previewUrl={form.photoUrl} />
            </div>

            <div className="stack">
              <label style={{ fontWeight: 600 }}>Full Name</label>
              <input
                className="input"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={onChange}
              />
            </div>

            <div className="stack">
              <label style={{ fontWeight: 600 }}>Instagram ID</label>
              <input
                className="input"
                name="instagramId"
                placeholder="e.g., @username"
                value={form.instagramId}
                onChange={onChange}
              />
            </div>

            <div className="stack">
              <label style={{ fontWeight: 600 }}>Bio</label>
              <textarea
                className="input"
                name="bio"
                rows={4}
                placeholder="A short bio"
                value={form.bio}
                onChange={onChange}
              />
            </div>

            <div className="stack">
              <label style={{ fontWeight: 600 }}>Interests (comma-separated)</label>
              <input
                className="input"
                name="interests"
                placeholder="music, sports, travel"
                value={form.interests}
                onChange={onChange}
              />
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  // Reset to loaded profile values
                  if (!profile) return
                  setForm({
                    name: profile.name ?? '',
                    instagramId: profile.instagramId ?? '',
                    bio: profile.bio ?? '',
                    interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : (profile.interests ?? ''),
                    photoUrl: profile.photoUrl,
                  })
                  setFile(null)
                }}
                disabled={saving}
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}