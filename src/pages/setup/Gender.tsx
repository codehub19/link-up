import { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function Gender() {
  const { user, profile, refreshProfile } = useAuth()
  const [sel, setSel] = useState<'male' | 'female' | ''>(profile?.gender ?? '')
  const nav = useNavigate()

  const next = async () => {
    if (!user) return
    if (!sel) return toast.error('Please select a gender')
    await setDoc(
      doc(db, 'users', user.uid),
      { gender: sel, isProfileComplete: false },
      { merge: true }
    )
    await refreshProfile()
    nav('/setup/profile')
  }

  return (
    <>
      <Navbar />
      <div className="container narrow">
        <h2>Let's get started. Who are you?</h2>
        <div className="gender-grid">
          <button
            className={`gender-card ${sel === 'male' ? 'active' : ''}`}
            onClick={() => setSel('male')}
          >
            Male
          </button>
          <button
            className={`gender-card ${sel === 'female' ? 'active' : ''}`}
            onClick={() => setSel('female')}
          >
            Female
          </button>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={next}>Continue</button>
        </div>
      </div>
    </>
  )
}