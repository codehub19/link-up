import React, { useEffect, useState } from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { toast } from 'sonner'
import MaleTabs from '../../../components/MaleTabs'
import { uploadProfilePhoto } from '../../../firebase'
import AvatarUpload from '../../../components/AvatarUpload'
import '../profile.edit.css'
import InterestsSelect from '../../../components/InterestsSelect'
import EditCollegeId from '../EditCollegeId';
import LoadingHeart from '../../../components/LoadingHeart'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { compressImage } from '../../../utils/compressImage' // <-- ADD THIS IMPORT

export default function MaleEditProfile() {
  const { loading, user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [insta, setInsta] = useState(profile?.instagramId ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setInsta(profile.instagramId ?? '')
      setBio(profile.bio ?? '')
      setInterests(profile.interests ?? [])
    }
  }, [profile])

  // compress before upload
  const handleFile = async (f: File | null) => {
    if (!f) {
      setFile(null)
      return
    }
    const compressed = await compressImage(f)
    setFile(compressed)
  }

  const save = async () => {
    if (!user) return
    try {
      setSaving(true)
      let photoUrl = profile?.photoUrl
      if (file) photoUrl = await uploadProfilePhoto(user.uid, file)

      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        instagramId: insta.replace(/^@/, '').trim(),
        bio: bio.trim(),
        interests,
        photoUrl,
      })
      await refreshProfile()
      toast.success('Profile updated')
      setFile(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }
  if (loading) return <div className="loading-page-wrapper">
        <LoadingHeart size={72} />
      </div>;

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />
        <h2>Edit Profile</h2>

        <div className="edit-card">
          <div className="edit-head">
            <AvatarUpload previewUrl={profile?.photoUrl} onFile={handleFile} />
          </div>

          <div className="edit-body">
            <label className="field">
              <span className="field-label">Full name</span>
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
              <span className="field-label">Bio</span>
              <textarea
                className="field-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio"
                rows={4}
              />
            </label>
            <EditCollegeId />
            <div className="field">
              <span className="field-label">Interests</span>
              <div className="interests-wrap">
                <InterestsSelect value={interests} onChange={setInterests} />
                <small style={{ color: '#9aa0b4' }}>Pick up to 5 that describe you best</small>
              </div>
            </div>

            <div className="save-row">
              <button className="btn-ghost" type="button" onClick={() => {
                if (!profile) return
                setName(profile.name ?? '')
                setInsta(profile.instagramId ?? '')
                setBio(profile.bio ?? '')
                setInterests(profile.interests ?? [])
                setFile(null)
              }} disabled={saving}>Reset</button>

              <button className="btn-gradient" onClick={save} disabled={saving}>
                {saving ? <LoadingSpinner /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}