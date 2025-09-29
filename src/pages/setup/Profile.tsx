import { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import FileUpload from '../../components/FileUpload'
import InterestsSelect from '../../components/InterestsSelect'
import { saveUserProfile, uploadProfilePhoto } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const COLLEGES = [
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

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [insta, setInsta] = useState(profile?.instagramId ?? '')
  const [college, setCollege] = useState(profile?.college ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nav = useNavigate()

  const submit = async () => {
    if (!user || !profile?.gender) return
    if (!name || !insta || !college || (!file && !profile.photoUrl) || !bio || interests.length === 0) {
      return toast.error('Please fill all required fields')
    }
    try {
      setSubmitting(true)
      let photoUrl = profile.photoUrl
      if (file) {
        photoUrl = await uploadProfilePhoto(user.uid, file)
      }
      await saveUserProfile(user.uid, {
        name,
        gender: profile.gender,
        instagramId: insta.replace(/^@/, ''),
        college,
        photoUrl: photoUrl!,
        bio,
        interests,
      })
      await refreshProfile()
      toast.success('Profile saved')
      nav('/dashboard')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="container narrow">
        <h2>Complete your profile</h2>
        <div className="form">
          <label>Full Name<span className="req">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />

          <label>Instagram ID<span className="req">*</span></label>
          <div className="ig">
            <span>@</span>
            <input value={insta.replace(/^@/, '')} onChange={(e) => setInsta(e.target.value)} placeholder="yourhandle" />
          </div>

          <label>Your College<span className="req">*</span></label>
          <select value={college} onChange={(e) => setCollege(e.target.value)}>
            <option value="">Select your college</option>
            {COLLEGES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>Upload Your Best Photo<span className="req">*</span></label>
          <FileUpload onFile={setFile} previewUrl={profile?.photoUrl} />

          <label>Your Bio<span className="req">*</span></label>
          <textarea maxLength={250} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself (max 250 chars)" />

          <label>Your Interests<span className="req">*</span></label>
          <InterestsSelect value={interests} onChange={setInterests} />

          <div className="actions">
            <button className="btn primary" disabled={submitting} onClick={submit}>
              {submitting ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}