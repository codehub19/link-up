import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, mergeSetupStatus } from '../../firebase'
import './setup.styles.css'

type Props = { embedded?: boolean; onComplete?: () => void }
const TERMS_VERSION = 1

export default function Terms({ embedded, onComplete }: Props) {
  const { user, refreshProfile } = useAuth()
  const [agree, setAgree] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = async () => {
    if (!user || !agree || saving) return
    setSaving(true); setError(null)
    try {
      // Ensure doc exists
      const ref = doc(db, 'users', user.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          acceptedTermsVersion: TERMS_VERSION,
          acceptedTermsAt: serverTimestamp(),
          setupStatus: { terms: true },
          updatedAt: serverTimestamp(),
        })
      } else {
        // Merge fields + nested status
        await updateDoc(ref, {
          acceptedTermsVersion: TERMS_VERSION,
          acceptedTermsAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        await mergeSetupStatus(user.uid, { terms: true })
      }
      await refreshProfile()
      if (embedded && onComplete) onComplete()
    } catch (e: any) {
      console.error('[Terms] error', e)
      setError(e?.message || 'Failed to save acceptance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Terms & Conditions</h1>
          <p className="setup-sub">Review & accept to continue.</p>
          <div className="terms-box">
            <h3 style={{marginTop:0}}>Summary</h3>
            <ul>
              <li>Be respectful & authentic.</li>
              <li>No harassment or spam.</li>
              <li>Accurate college information only.</li>
            </ul>
            <p style={{marginBottom:0}}>Continuing means you accept these terms.</p>
          </div>
          <label className="terms-accept">
            <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
            <span>I agree to the Terms & Conditions.</span>
          </label>
          {error && <div style={{color:'#ff6b84', fontSize:13, marginTop:8}}>{error}</div>}
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!agree || saving} onClick={accept}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}