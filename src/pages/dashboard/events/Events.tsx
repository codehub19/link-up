import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import EmptyState from '../../../components/ui/EmptyState'
import { useAuth } from '../../../state/AuthContext'
import {
  AppEvent, EVENT_TYPES, EventType, eventState, formatEventWhen, getMyAttendance, isFull, ms, subscribeEvents,
} from '../../../services/events'
import { DateBadge, EventCover, Icon, SuggestSheet } from './EventBits'
import './Events.css'

type Filter = 'all' | 'mine' | 'college' | EventType

const WEEK = 7 * 24 * 3600 * 1000

/** Events tab: fests, find-a-partner nights, meetups. */
export default function EventsPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [events, setEvents] = useState<AppEvent[] | null>(null)
  const [going, setGoing] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [showPast, setShowPast] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  useEffect(() => subscribeEvents(setEvents), [])

  // Which of the current events am I going to?
  const activeIds = useMemo(() => (events || []).filter((e) => eventState(e) !== 'past').map((e) => e.id).join(','), [events])
  useEffect(() => {
    if (!user || !activeIds) return
    let alive = true
    Promise.all(activeIds.split(',').map(async (id) => [id, !!(await getMyAttendance(id, user.uid))] as const))
      .then((pairs) => { if (alive) setGoing(Object.fromEntries(pairs)) })
    return () => { alive = false }
  }, [user, activeIds])

  const now = Date.now()
  const all = events || []
  const current = all.filter((e) => eventState(e, now) !== 'past')
  const past = all.filter((e) => eventState(e, now) === 'past').reverse()
  const myCollege = profile?.college as string | undefined

  const matches = (e: AppEvent) => {
    if (filter === 'all') return true
    if (filter === 'mine') return !!going[e.id]
    if (filter === 'college') return !!myCollege && (e.college === myCollege || !e.college)
    if (filter === 'buddy') return e.type === 'buddy' || !!e.buddy
    return e.type === filter
  }
  const shown = current.filter(matches)
  const featured = filter === 'all' ? current.filter((e) => (e.featured || e.buddy) && eventState(e, now) !== 'cancelled').slice(0, 6) : []
  const featuredIds = new Set(featured.map((e) => e.id))
  const listed = shown.filter((e) => !featuredIds.has(e.id))
  const thisWeek = listed.filter((e) => ms(e.startAt) - now < WEEK)
  const later = listed.filter((e) => ms(e.startAt) - now >= WEEK)

  // Only offer type chips that have events
  const typesPresent = Array.from(new Set(current.map((e) => e.type))).filter((t) => t !== 'buddy')
  const goingCount = current.filter((e) => going[e.id]).length

  const card = (e: AppEvent) => {
    const st = eventState(e, now)
    return (
      <button key={e.id} type="button" className={`ev-card ${st}`} onClick={() => nav(`/dashboard/events/${e.id}`)}>
        <div className="ev-card-media">
          <EventCover e={e} />
          <DateBadge e={e} />
        </div>
        <div className="ev-card-body">
          <div className="ev-card-kicker">
            {(e.buddy || e.type === 'buddy') && <span className="ev-tag buddy">Find a {e.buddyLabel || 'partner'}</span>}
            {!(e.buddy || e.type === 'buddy') && <span className="ev-tag">{EVENT_TYPES[e.type]?.label || 'Event'}</span>}
            {st === 'live' && <span className="ev-tag live">Happening now</span>}
            {st === 'cancelled' && <span className="ev-tag cancelled">Cancelled</span>}
          </div>
          <h3 className="ev-card-title">{e.title}</h3>
          <div className="ev-card-meta">{formatEventWhen(e)}</div>
          {(e.venue || e.city) && <div className="ev-card-meta">{[e.venue, e.city].filter(Boolean).join(', ')}</div>}
          <div className="ev-card-foot">
            <span className="ev-going-count">{Icon.people} {e.attendeeCount || 0} going</span>
            {going[e.id]
              ? <span className="ev-pill going">{Icon.check} Going</span>
              : isFull(e) ? <span className="ev-pill muted">Full</span> : null}
          </div>
        </div>
      </button>
    )
  }

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(goingCount ? [{ id: 'mine' as Filter, label: `Going · ${goingCount}` }] : []),
    { id: 'buddy', label: '💃 Find a partner' },
    ...(myCollege ? [{ id: 'college' as Filter, label: '🎓 My college' }] : []),
    ...typesPresent.map((t) => ({ id: t as Filter, label: `${EVENT_TYPES[t].emoji} ${EVENT_TYPES[t].label}` })),
  ]

  return (
    <>
      <Navbar />
      <div className="dashboard-container ev-page">
        <div className="ev-head">
          <div>
            <h1 className="ev-title">Events</h1>
            <p className="ev-sub">Fests, find-a-partner nights and meetups — go with new people.</p>
          </div>
          <button type="button" className="ev-icon-btn" onClick={() => setSuggestOpen(true)} aria-label="Suggest an event">{Icon.plus}</button>
        </div>

        <div className="ev-chips" role="tablist" aria-label="Filter events">
          {chips.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} className={`ev-chip ${filter === c.id ? 'on' : ''}`} onClick={() => setFilter(c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        {events === null ? (
          <div className="ev-skeletons" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="ev-skeleton" />)}
          </div>
        ) : current.length === 0 && past.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No events yet"
            text="Fests, garba nights, treks and meetups will show up here. Know one coming up? Tell us about it."
            actions={[{ label: 'Suggest an event', onClick: () => setSuggestOpen(true) }]}
          />
        ) : (
          <>
            {featured.length > 0 && (
              <section className="ev-featured" aria-label="Featured events">
                {featured.map((e) => (
                  <button key={e.id} type="button" className="ev-feature" onClick={() => nav(`/dashboard/events/${e.id}`)}>
                    <EventCover e={e} big />
                    <div className="ev-feature-shade" />
                    <div className="ev-feature-body">
                      <span className="ev-tag buddy">{e.buddy || e.type === 'buddy' ? `Find a ${e.buddyLabel || 'partner'}` : EVENT_TYPES[e.type]?.label}</span>
                      <h3>{e.title}</h3>
                      <p>{formatEventWhen(e)}{e.city ? ` · ${e.city}` : ''}</p>
                      <span className="ev-feature-foot">
                        {e.attendeeCount || 0} going{going[e.id] ? ' · You’re going' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </section>
            )}

            {shown.length === 0 && (
              <p className="ev-none">No events here right now. <button type="button" onClick={() => setFilter('all')}>See all events</button></p>
            )}

            {thisWeek.length > 0 && (
              <section>
                <h2 className="ev-section">This week</h2>
                <div className="ev-list">{thisWeek.map(card)}</div>
              </section>
            )}
            {later.length > 0 && (
              <section>
                <h2 className="ev-section">{thisWeek.length ? 'Coming up' : 'Upcoming'}</h2>
                <div className="ev-list">{later.map(card)}</div>
              </section>
            )}

            {past.length > 0 && filter === 'all' && (
              <section>
                <button type="button" className="ev-past-toggle" onClick={() => setShowPast((v) => !v)}>
                  {showPast ? 'Hide past events' : `Past events (${past.length})`}
                </button>
                {showPast && <div className="ev-list past">{past.slice(0, 20).map(card)}</div>}
              </section>
            )}
          </>
        )}

        <button type="button" className="ev-host" onClick={() => setSuggestOpen(true)}>
          <span className="ev-host-emoji" aria-hidden="true">🎪</span>
          <span>
            <strong>Organising a fest or event?</strong>
            <small>Run a find-a-partner night or meetup on DateU — we’ll help people connect before they arrive.</small>
          </span>
        </button>
      </div>

      {user && <SuggestSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} uid={user.uid} name={profile?.name} />}
    </>
  )
}
