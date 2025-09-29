import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import FileUpload from '../../../components/FileUpload'
import InterestsSelect from '../../../components/InterestsSelect'
import { doc, updateDoc } from 'firebase/firestore'
import { db, uploadProfilePhoto } from '../../../firebase'
import { toast } from 'sonner'

export default function MaleEditProfile() {
  const { user, profile, refreshProfile } = useAuth()
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

  const save = async () => {
    if (!user) return
    try {
      setSaving(true)
      let photoUrl = profile?.photoUrl
      if (file) photoUrl = await uploadProfilePhoto(user.uid, file)
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        instagramId: insta.replace(/^@/, ''),
        bio,
        interests,
        photoUrl,
      })
      await refreshProfile()
      toast.success('Profile updated')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Edit Profile</h2>
        <div className="form">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Instagram</label>
          <div className="ig">
            <span>@</span>
            <input value={insta.replace(/^@/, '')} onChange={(e) => setInsta(e.target.value)} />
          </div>
          <label>Photo</label>
          <FileUpload onFile={setFile} previewUrl={profile?.photoUrl} />
          <label>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          <label>Interests</label>
          <InterestsSelect value={interests} onChange={setInterests} />
          <div className="actions">
            <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </>
  )
}