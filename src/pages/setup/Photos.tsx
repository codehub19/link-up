import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupShell, SetupHeader, StepFooter, CameraBadge } from './SetupShared'
import './setup.styles.css'

type Slot = { id: number; url?: string }

export default function PhotosStep() {
  const nav = useNavigate()
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: 6 }, (_, i) => ({ id: i })))
  const inputRef = useRef<HTMLInputElement | null>(null)

  const addPhoto = (file: File, slotIndex: number) => {
    const reader = new FileReader()
    reader.onload = () => {
      setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, url: String(reader.result) } : s))
    }
    reader.readAsDataURL(file)
  }

  const onPick = (i: number) => {
    const input = inputRef.current
    if (!input) return
    input.onchange = (e: any) => {
      const f = e.target.files?.[0]
      if (f) addPhoto(f, i)
      e.target.value = ''
    }
    input.click()
  }

  const filled = slots.filter(s => s.url).length

  return (
    <SetupShell step={5} total={6}>
      <SetupHeader title="Upload your photos" sub="Add up to 4 photos. First one will be your primary photo." />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" />
      <div className="photo-grid">
        {slots.map((s, i) => (
          <div key={s.id} className={`photo-slot ${s.url ? 'has-image' : ''}`}>
            {s.url ? (
              <>
                <img src={s.url} alt={`Photo ${i+1}`} />
                <button className="photo-remove" onClick={() => setSlots(prev => prev.map((p, j) => j===i ? { ...p, url: undefined } : p))}>✕</button>
              </>
            ) : (
              <button className="photo-add" onClick={() => onPick(i)}>+</button>
            )}
          </div>
        ))}
      </div>
      <div className="primary-photo-hint">
        <span className="avatar-preview">
          <span className="avatar-circle"><CameraBadge /></span>
        </span>
        <span>Add a clear photo of you. Avoid group pics and sunglasses.</span>
      </div>
      <StepFooter onNext={() => nav('/setup/details')} disabled={filled === 0} />
    </SetupShell>
  )
}