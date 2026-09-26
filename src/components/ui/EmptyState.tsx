import React from 'react'
import { Link } from 'react-router-dom'
import './EmptyState.css'

type Action = { label: string; to?: string; onClick?: () => void; ghost?: boolean }

const ICONS: Record<string, React.ReactNode> = {
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  sparkle: <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
}

/** Friendly empty screen: icon, title, one line of help and up to two actions. */
export default function EmptyState({ icon = 'sparkle', title, text, actions = [] }: {
  icon?: keyof typeof ICONS | string
  title: string
  text?: React.ReactNode
  actions?: Action[]
}) {
  return (
    <div className="empty-state-app">
      <div className="empty-state-icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[icon] || ICONS.sparkle}
        </svg>
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actions.length > 0 && (
        <div className="empty-state-actions">
          {actions.map((a) => a.to
            ? <Link key={a.label} to={a.to} className={`empty-state-btn ${a.ghost ? 'ghost' : ''}`}>{a.label}</Link>
            : <button key={a.label} type="button" onClick={a.onClick} className={`empty-state-btn ${a.ghost ? 'ghost' : ''}`}>{a.label}</button>)}
        </div>
      )}
    </div>
  )
}
