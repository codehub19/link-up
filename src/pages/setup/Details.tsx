import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupShell, SetupHeader, StepFooter, CameraBadge } from './SetupShared'
import './setup.styles.css'

export default function DetailsStep() {
  const nav = useNavigate()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const canContinue = first.trim().length > 0 && dob.length > 0

  return (
    <SetupShell step={6} total={6} showSkip={false}>
      <SetupHeader title="Profile details" sub="Fill in your info to finish setup." />
      <div className="details-form">
        <div className="avatar-upload">
          <div className="avatar-ring">
            {avatar ? <img src={avatar} alt="Avatar preview" /> : <span className="avatar-placeholder" />}
            <button
              className="avatar-pick"
              onClick={() => inputRef.current?.click()}
              aria-label="Upload avatar"
            >
              <CameraBadge />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => setAvatar(String(reader.result))
                reader.readAsDataURL(f)
              }}
            />
          </div>
        </div>

        <label className="field">
          <span className="field-label">First name</span>
          <input className="field-input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Your first name" />
        </label>

        <label className="field">
          <span className="field-label">Last name</span>
          <input className="field-input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Optional" />
        </label>

        <label className="field">
          <span className="field-label">Date of birth</span>
          <input className="field-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Gender</span>
          <select className="field-input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </label>
      </div>

      <StepFooter cta="Finish" onNext={() => nav('/dashboard')} disabled={!canContinue} />
    </SetupShell>
  )
}