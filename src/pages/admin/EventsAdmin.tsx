import React, { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { useDialog } from '../../components/ui/Dialog'
import {
  AppEvent, Attendee, EVENT_TYPES, EventStatus, EventType, deleteEvent, listAllEvents, listAttendeesAdmin,
  listEventSuggestions, ms, saveEvent, setSuggestionStatus, uploadEventCover,
} from '../../services/events'

type Form = {
  title: string
  type: EventType
  buddy: boolean
  buddyLabel: string
  description: string
  venue: string
  city: string
  college: string
  mapUrl: string
  start: string
  end: string
  capacity: string
  price: string
  organizer: string
  ticketUrl: string
  sponsorName: string
  sponsorLogoUrl: string
  sponsorUrl: string
  coverUrl: string
  status: EventStatus
  featured: boolean
}

/** Only http(s) links are stored (no javascript: URLs). */
const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null)

const EMPTY: Form = {
  title: '', type: 'meetup', buddy: false, buddyLabel: '', description: '', venue: '', city: '', college: '', mapUrl: '',
  start: '', end: '', capacity: '', price: '', organizer: 'DateU', ticketUrl: '', sponsorName: '', sponsorLogoUrl: '', sponsorUrl: '', coverUrl: '', status: 'draft', featured: false,
}

// One-tap starting points for common events
const TEMPLATES: { label: string; form: Partial<Form> }[] = [
  { label: '💃 Garba partner night', form: { title: 'Find your Garba partner', type: 'buddy', buddy: true, buddyLabel: 'Garba partner', description: 'Navratri is better with a partner! Register, say you’re looking for a Garba partner, and meet someone new to dance with.\n\nGo with friends, meet new people, and have a great night.' } },
  { label: '🎪 Fest meetup', form: { title: 'Fest meetup', type: 'fest', buddy: true, buddyLabel: 'fest buddy', description: 'Going to the fest? Find people to explore it with — concerts, stalls and competitions are more fun together.' } },
  { label: '🥾 Trek buddies', form: { title: 'Weekend trek', type: 'trip', buddy: true, buddyLabel: 'trek buddy', description: 'Looking for people to trek with? Register and find your trek buddy.' } },
  { label: '💻 Hackathon teammates', form: { title: 'Find hackathon teammates', type: 'hackathon', buddy: true, buddyLabel: 'teammate', description: 'Need a team? Say what you’re good at and find teammates before the hackathon starts.' } },
  { label: '📚 Exam study group', form: { title: 'Exam study group', type: 'study', buddy: true, buddyLabel: 'study buddy', description: 'Study together before exams. Find a study buddy from your college.' } },
  { label: '🎬 Movie night', form: { title: 'Movie night', type: 'movie', buddy: false, description: 'Watch a movie together and meet new people.' } },
  { label: '🏏 Match screening', form: { title: 'Big match screening', type: 'sports', buddy: true, buddyLabel: 'match buddy', description: 'Watch the match with other fans on campus.' } },
  { label: '☕ Speed friending', form: { title: 'Speed friending', type: 'meetup', buddy: false, description: 'Meet 10 new people in an hour. Quick chats, no pressure.' } },
]

const toLocal = (t: any) => {
  const v = ms(t)
  if (!v) return ''
  const d = new Date(v)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function csvCell(v: any) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function EventsAdmin() {
  const { showConfirm } = useDialog()
  const [events, setEvents] = useState<AppEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [people, setPeople] = useState<{ event: AppEvent; list: Attendee[] } | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [ev, sg] = await Promise.all([listAllEvents(), listEventSuggestions().catch(() => [])])
      setEvents(ev)
      setSuggestions(sg)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const edit = (e: AppEvent) => {
    setEditingId(e.id)
    setCoverFile(null)
    setForm({
      title: e.title, type: e.type, buddy: !!e.buddy, buddyLabel: e.buddyLabel || '', description: e.description || '',
      venue: e.venue || '', city: e.city || '', college: e.college || '', mapUrl: e.mapUrl || '',
      start: toLocal(e.startAt), end: toLocal(e.endAt), capacity: e.capacity ? String(e.capacity) : '',
      price: e.price || '', organizer: e.organizer || '', ticketUrl: e.ticketUrl || '', sponsorName: e.sponsorName || '', sponsorLogoUrl: e.sponsorLogoUrl || '', sponsorUrl: e.sponsorUrl || '', coverUrl: e.coverUrl || '', status: e.status, featured: !!e.featured,
    })
    document.getElementById('eventForm')?.scrollIntoView({ behavior: 'smooth' })
  }

  const reset = () => { setEditingId(null); setForm(EMPTY); setCoverFile(null) }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.title.trim() || !form.start || !form.end) { toast.error('Title, start and end are required.'); return }
    const startAt = Timestamp.fromDate(new Date(form.start))
    const endAt = Timestamp.fromDate(new Date(form.end))
    if (endAt.toMillis() <= startAt.toMillis()) { toast.error('End must be after start.'); return }
    setSaving(true)
    try {
      const data: any = {
        title: form.title.trim(), type: form.type, buddy: form.buddy || form.type === 'buddy',
        buddyLabel: form.buddyLabel.trim() || null, description: form.description.trim(), venue: form.venue.trim(),
        city: form.city.trim(), college: form.college.trim() || null, mapUrl: form.mapUrl.trim() || null,
        startAt, endAt, capacity: form.capacity ? Math.max(1, Number(form.capacity)) : 0,
        price: form.price.trim() || null, organizer: form.organizer.trim() || null,
        ticketUrl: safeUrl(form.ticketUrl), sponsorName: form.sponsorName.trim() || null,
        sponsorLogoUrl: safeUrl(form.sponsorLogoUrl), sponsorUrl: safeUrl(form.sponsorUrl),
        coverUrl: form.coverUrl || null, status: form.status, featured: form.featured,
      }
      const id = await saveEvent(editingId, data)
      if (coverFile) {
        const url = await uploadEventCover(id, coverFile)
        await saveEvent(id, { ...data, coverUrl: url })
      }
      toast.success(editingId ? 'Event updated' : 'Event created')
      reset()
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (e: AppEvent) => {
    if (!(await showConfirm(`Delete “${e.title}”? This can't be undone. (To call it off, set it to Cancelled instead.)`))) return
    await deleteEvent(e.id)
    load()
  }

  const quickStatus = async (e: AppEvent, status: EventStatus) => {
    const { id, attendeeCount: _a, createdAt: _c, updatedAt: _u, ...rest } = e as any
    await saveEvent(id, { ...rest, status })
    toast.success(`Event ${status}`)
    load()
  }

  const showPeople = async (e: AppEvent) => {
    const list = await listAttendeesAdmin(e.id)
    list.sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
    setPeople({ event: e, list })
  }

  const exportCsv = () => {
    if (!people) return
    const rows = [['uid', 'name', 'college', 'gender', 'looking for partner', 'note', 'registered at']]
    people.list.forEach((a) => rows.push([a.uid, a.name || '', a.college || '', a.gender || '', a.lookingForBuddy ? 'yes' : 'no', a.note || '', ms(a.createdAt) ? new Date(ms(a.createdAt)).toISOString() : '']))
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${people.event.title.replace(/[^\w]+/g, '-').toLowerCase()}-attendees.csv`
    a.click()
  }

  const now = Date.now()
  const newSuggestions = suggestions.filter((s) => s.status !== 'done')

  return (
    <div className="admin-container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Events</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)' }}>Fests, find-a-partner nights and meetups. Drafts are only visible to admins.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { reset(); document.getElementById('eventForm')?.scrollIntoView({ behavior: 'smooth' }) }}>+ New event</button>
      </div>

      {newSuggestions.length > 0 && (
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Event suggestions ({newSuggestions.length})</h3>
          <div className="stack" style={{ gap: 12 }}>
            {newSuggestions.map((s) => (
              <div key={s.id} style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <strong>{s.title}</strong>
                    <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                      {[s.when, s.where].filter(Boolean).join(' · ')} {s.name ? `— from ${s.name}` : ''}
                    </div>
                    {s.details && <p style={{ margin: '6px 0 0', fontSize: 14, whiteSpace: 'pre-line' }}>{s.details}</p>}
                    {s.contact && <div style={{ fontSize: 13, marginTop: 4 }}>Contact: {s.contact}</div>}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => { reset(); setForm({ ...EMPTY, title: s.title, description: s.details || '', venue: s.where || '' }); document.getElementById('eventForm')?.scrollIntoView({ behavior: 'smooth' }) }}>Create</button>
                    <button className="btn btn-sm btn-ghost" onClick={async () => { await setSuggestionStatus(s.id, 'done'); load() }}>Done</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 36 }}>
        {loading ? <div className="admin-card">Loading…</div> : events.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--admin-text-muted)', padding: 40 }}>
            No events yet. Start from a template below.
          </div>
        ) : events.map((e) => {
          const past = ms(e.endAt) < now
          const t = EVENT_TYPES[e.type]
          return (
            <div key={e.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: past ? 0.7 : 1 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 28 }}>{t?.emoji}</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {e.featured && <span className="badge badge-warning">Featured</span>}
                  <span className={`badge badge-${e.status === 'published' ? 'success' : e.status === 'cancelled' ? 'danger' : 'neutral'}`}>{past ? 'Ended' : e.status}</span>
                </div>
              </div>
              <strong style={{ fontSize: 17 }}>{e.title}</strong>
              <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                {new Date(ms(e.startAt)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {e.city ? ` · ${e.city}` : ''}
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-info">{t?.label}</span>
                {e.buddy && <span className="badge badge-info">Find a {e.buddyLabel || 'partner'}</span>}
                <span className="badge badge-info">{e.attendeeCount || 0}{e.capacity ? ` / ${e.capacity}` : ''} going</span>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => edit(e)}>Edit</button>
                <button className="btn btn-sm btn-ghost" onClick={() => showPeople(e)}>Attendees</button>
                {e.status !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => quickStatus(e, 'published')}>Publish</button>}
                {e.status === 'published' && !past && <button className="btn btn-sm btn-ghost" onClick={() => quickStatus(e, 'cancelled')}>Cancel</button>}
                <button className="btn btn-sm btn-ghost" style={{ color: '#dc2626' }} onClick={() => remove(e)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="admin-card" style={{ maxWidth: 860 }} id="eventForm">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{editingId ? 'Edit event' : 'New event'}</h3>
          {editingId && <button className="btn btn-sm btn-ghost" onClick={reset}>Cancel edit</button>}
        </div>

        {!editingId && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
            {TEMPLATES.map((tp) => (
              <button key={tp.label} type="button" className="btn btn-sm btn-ghost" onClick={() => setForm({ ...EMPTY, ...tp.form })}>{tp.label}</button>
            ))}
          </div>
        )}

        <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
          <div className="stack">
            <label>Title</label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Find your Garba partner — IIT Delhi" maxLength={100} />
          </div>
          <div className="grid cols-2" style={{ gap: 14 }}>
            <div className="stack">
              <label>Type</label>
              <select className="input" value={form.type} onChange={(e) => set('type', e.target.value as EventType)}>
                {(Object.keys(EVENT_TYPES) as EventType[]).map((k) => <option key={k} value={k}>{EVENT_TYPES[k].emoji} {EVENT_TYPES[k].label}</option>)}
              </select>
            </div>
            <div className="stack">
              <label>Status</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as EventStatus)}>
                <option value="draft">Draft (admins only)</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.buddy || form.type === 'buddy'} disabled={form.type === 'buddy'} onChange={(e) => set('buddy', e.target.checked)} />
            Find-a-buddy event (attendees can say they’re looking for a partner and connect)
          </label>
          {(form.buddy || form.type === 'buddy') && (
            <div className="stack">
              <label>Partner word</label>
              <input className="input" value={form.buddyLabel} onChange={(e) => set('buddyLabel', e.target.value)} placeholder="Garba partner / trek buddy / teammate" maxLength={30} />
            </div>
          )}
          <div className="stack">
            <label>Description</label>
            <textarea className="input" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid cols-2" style={{ gap: 14 }}>
            <div className="stack"><label>Starts</label><input className="input" type="datetime-local" value={form.start} onChange={(e) => set('start', e.target.value)} /></div>
            <div className="stack"><label>Ends</label><input className="input" type="datetime-local" value={form.end} onChange={(e) => set('end', e.target.value)} /></div>
            <div className="stack"><label>Venue</label><input className="input" value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="SAC lawns, IIT Delhi" /></div>
            <div className="stack"><label>City</label><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="New Delhi" /></div>
            <div className="stack"><label>College (optional, for “My college”)</label><input className="input" value={form.college} onChange={(e) => set('college', e.target.value)} placeholder="Exact college name" /></div>
            <div className="stack"><label>Google Maps link (optional)</label><input className="input" value={form.mapUrl} onChange={(e) => set('mapUrl', e.target.value)} /></div>
            <div className="stack"><label>Capacity (blank = no limit)</label><input className="input" type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></div>
            <div className="stack"><label>Price text (optional)</label><input className="input" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Free / ₹199 at the gate" /></div>
            <div className="stack"><label>Organiser</label><input className="input" value={form.organizer} onChange={(e) => set('organizer', e.target.value)} /></div>
            <div className="stack"><label>Ticket link (optional)</label><input className="input" value={form.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} placeholder="https://unstop.com/… or the organiser’s page" /></div>
            <div className="stack"><label>Sponsor name (optional)</label><input className="input" value={form.sponsorName} onChange={(e) => set('sponsorName', e.target.value)} placeholder="Shown as “Presented by …”" /></div>
            <div className="stack"><label>Sponsor logo URL (optional)</label><input className="input" value={form.sponsorLogoUrl} onChange={(e) => set('sponsorLogoUrl', e.target.value)} placeholder="https://…/logo.png" /></div>
            <div className="stack"><label>Sponsor website (optional)</label><input className="input" value={form.sponsorUrl} onChange={(e) => set('sponsorUrl', e.target.value)} /></div>
            <div className="stack">
              <label>Cover image (optional)</label>
              <input className="input" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              {form.coverUrl && !coverFile && (
                <span style={{ fontSize: 12 }}>Current cover set · <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('coverUrl', '')}>Remove</button></span>
              )}
            </div>
          </div>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            Feature at the top of the Events tab
          </label>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}</button>
            {form.status === 'draft' && <span style={{ fontSize: 13, color: 'var(--admin-text-muted)', alignSelf: 'center' }}>Set status to Published when it’s ready.</span>}
          </div>
        </form>
      </div>

      {people && (
        <div className="admin-modal-backdrop" onClick={() => setPeople(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="admin-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{people.event.title} — {people.list.length} going</h3>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-sm btn-ghost" onClick={exportCsv} disabled={!people.list.length}>Export CSV</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setPeople(null)}>Close</button>
              </div>
            </div>
            <table style={{ width: '100%', marginTop: 12, fontSize: 14, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>College</th><th>Partner?</th><th>Note</th></tr></thead>
              <tbody>
                {people.list.map((a) => (
                  <tr key={a.uid} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td style={{ padding: '8px 4px' }}><a href={`/admin/users/${a.uid}`}>{a.name || a.uid}</a></td>
                    <td>{a.college || '—'}</td>
                    <td>{a.lookingForBuddy ? 'Yes' : '—'}</td>
                    <td style={{ maxWidth: 240 }}>{a.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {people.list.length === 0 && <p style={{ color: 'var(--admin-text-muted)' }}>Nobody yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
