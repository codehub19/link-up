import React from 'react'
import { useNavigate } from 'react-router-dom'
import './setup.styles.css'

export function SetupShell({
  children,
  step = 1,
  total = 6,
  showSkip = false,
  onSkip,
}: {
  children: React.ReactNode
  step?: number
  total?: number
  showSkip?: boolean
  onSkip?: () => void
}) {
  const nav = useNavigate()
  return (
    <div className="setup-page">
      <div className="setup-top">
        <button className="setup-icon-btn" aria-label="Go back" onClick={() => nav(-1)}>
          ←
        </button>
        <div className="setup-progress">
          <div className="setup-progress-bar" style={{ width: `${(step / total) * 100}%` }} />
        </div>
        {showSkip ? (
          <button className="setup-skip-btn" onClick={onSkip}>Skip</button>
        ) : <span className="setup-skip-placeholder" />}
      </div>
      <div className="setup-inner">
        {children}
      </div>
    </div>
  )
}

export function SetupHeader({
  title,
  sub,
}: {
  title: string
  sub?: string
}) {
  return (
    <header className="setup-header">
      <h1>{title}</h1>
      {sub ? <p>{sub}</p> : null}
    </header>
  )
}

export function StepFooter({
  cta = 'Continue',
  disabled,
  onNext,
}: {
  cta?: string
  disabled?: boolean
  onNext: () => void
}) {
  return (
    <div className="setup-footer">
      <button className="btn-primary-lg" disabled={disabled} onClick={onNext}>
        {cta}
      </button>
    </div>
  )
}

/* Small UI atoms */
export function GenderIcon({ type }: { type: 'male' | 'female' }) {
  if (type === 'male') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M14 3h7v7" stroke="url(#g)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 3l-6.2 6.2" stroke="url(#g)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="15" r="5.5" stroke="url(#g)" strokeWidth="1.8" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="24" y2="24">
            <stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/>
          </linearGradient>
        </defs>
      </svg>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="url(#g2)" strokeWidth="1.8" />
      <path d="M12 12v8M8 18h8" stroke="url(#g2)" strokeWidth="1.8" strokeLinecap="round"/>
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export function CameraBadge() {
  return (
    <span className="camera-badge" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10l1.2 2H21v10H3V9h2.8L7 7z" stroke="white" strokeWidth="1.7"/>
        <circle cx="12" cy="14" r="3.5" stroke="white" strokeWidth="1.7"/>
      </svg>
    </span>
  )
}