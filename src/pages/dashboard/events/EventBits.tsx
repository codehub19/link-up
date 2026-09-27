import { useState } from 'react'
import { toast } from 'sonner'
import { AppEvent, EVENT_TYPES, ms, suggestEvent } from '../../../services/events'

/** Cover image, or a gradient with the event type's emoji. */
export function EventCover({ e, className = '', big }: { e: AppEvent; className?: string; big?: boolean }) {
  const t = EVENT_TYPES[e.type] || EVENT_TYPES.meetup
  return (
    <div
      className={`ev-cover ${big ? 'big' : ''} ${className}`}
      style={e.coverUrl ? undefined : { background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
    >
      {e.coverUrl
        ? <img src={e.coverUrl} alt="" loading="lazy" />
        : <span className="ev-cover-emoji" aria-hidden="true">{t.emoji}</span>}
    </div>
  )
}

export function DateBadge({ e }: { e: AppEvent }) {
  const d = new Date(ms(e.startAt))
  return (
    <div className="ev-date" aria-hidden="true">
      <span>{d.toLocaleDateString([], { month: 'short' })}</span>
      <strong>{d.getDate()}</strong>
    </div>
  )
}

export const Icon = {
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  pin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  people: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  ticket: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" /><line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2" /></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  plus: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
}

/** Bottom sheet */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  if (!open) return null
  return (
    <div className="ev-sheet-backdrop" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="ev-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ev-sheet-handle" />
        {children}
      </div>
    </div>
  )
}

/** "Host an event with DateU" form for members and fest organisers. */
export function SuggestSheet({ open, onClose, uid, name }: { open: boolean; onClose: () => void; uid: string; name?: string }) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [when, setWhen] = useState('')
  const [where, setWhere] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await suggestEvent(uid, name || '', { title, details, when, where, contact })
      toast.success('Thanks! Our team will get back to you soon.')
      setTitle(''); setDetails(''); setWhen(''); setWhere(''); setContact('')
      onClose()
    } catch {
      toast.error('Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Suggest an event">
      <h3 className="ev-sheet-title">Suggest an event</h3>
      <p className="ev-sheet-sub">Organising a fest, a garba night or a trek? Tell us and we’ll help people find partners and friends for it.</p>
      <label className="ev-field">
        <span>What’s the event?</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Navratri Garba night at IIT Delhi" />
      </label>
      <div className="ev-field-row">
        <label className="ev-field">
          <span>When</span>
          <input value={when} onChange={(e) => setWhen(e.target.value)} maxLength={120} placeholder="12 Oct, 7 PM" />
        </label>
        <label className="ev-field">
          <span>Where</span>
          <input value={where} onChange={(e) => setWhere(e.target.value)} maxLength={120} placeholder="Venue, city" />
        </label>
      </div>
      <label className="ev-field">
        <span>Details (optional)</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="Tickets, who it's for, how people can join…" />
      </label>
      <label className="ev-field">
        <span>How can we reach you? (optional)</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="Phone, email or Instagram" />
      </label>
      <div className="ev-sheet-actions">
        <button type="button" className="ev-btn ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="ev-btn" onClick={submit} disabled={busy || !title.trim()}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
    </Sheet>
  )
}
