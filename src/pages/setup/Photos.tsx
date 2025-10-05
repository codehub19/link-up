import React, { useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { uploadProfilePhoto, updateProfileAndStatus, finalizeIfComplete, nextSetupRoute } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

type Slot = { id:number; url?:string; file?:File }
type Props = { embedded?: boolean; onComplete?: () => void }

export default function Photos({ embedded, onComplete }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: 4 }, (_,i)=>({ id:i })))
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)

  const pick = (i:number) => {
    const input = inputRef.current
    if (!input) return
    input.onchange = (e:any) => {
      const f = e.target.files?.[0]
      if (f) {
        const reader = new FileReader()
        reader.onload = () => {
          setSlots(prev => prev.map(s => s.id===i ? { ...s, url:String(reader.result), file:f } : s))
        }
        reader.readAsDataURL(f)
      }
      e.target.value = ''
    }
    input.click()
  }

  const filled = slots.some(s => s.file)

  const finish = async () => {
    if (!user) return
    const primary = slots.find(s => s.file)
    if (!primary?.file) return
    setSaving(true)
    try {
      const url = await uploadProfilePhoto(user.uid, primary.file)
      await updateProfileAndStatus(user.uid, { photoUrl: url }, { photos: true })
      await refreshProfile()
      await finalizeIfComplete(user.uid)
      if (embedded && onComplete) onComplete()
      else {
        const next = nextSetupRoute(profile)
        nav(next || '/dashboard')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {!embedded && <Navbar />}
      <div className={embedded ? '' : 'setup-page'}>
        <input ref={inputRef} type="file" accept="image/*" hidden />
        <section className="setup-card setup-card-glass">
          <h1 className="setup-title">Upload Photos</h1>
          <p className="setup-sub">Add at least one. First chosen becomes primary.</p>
          <div className="photo-grid">
            {slots.map((s,i)=>(
              <div key={s.id} className={`photo-slot ${s.url ? 'has-image':''}`}>
                {s.url ? (
                  <>
                    <img src={s.url} alt={`Photo ${i+1}`} />
                    <button className="photo-remove" aria-label="Remove"
                      onClick={()=>setSlots(prev=>prev.map(p=>p.id===s.id?{ id:p.id }:p))}
                    >✕</button>
                  </>
                ) : (
                  <button className="photo-add" onClick={()=>pick(i)} aria-label="Add photo">+</button>
                )}
              </div>
            ))}
          </div>
          <div className="setup-card-footer">
            <button className="btn-primary-lg" disabled={!filled || saving} onClick={finish}>
              {saving ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}