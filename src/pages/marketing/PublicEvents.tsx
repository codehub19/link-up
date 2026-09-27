import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/home/Footer/Footer'
import HomeBackground from '../../components/home/HomeBackground'
import JoinButton from '../../components/home/JoinButton'
import { useAuth } from '../../state/AuthContext'
import { SITE_URL, useSeo } from '../../utils/seo'
import { AppEvent, EVENT_TYPES, eventState, formatEventWhen, ms, subscribeEvent, subscribeEvents } from '../../services/events'
import { EventCover, Icon } from '../dashboard/events/EventBits'
import '../dashboard/events/Events.css'
import './marketing.css'

/*
 * Public event pages (/events, /events/:id): what people see when an event link
 * is shared on WhatsApp or Instagram, even before they have an account.
 * Signed-in members are sent to the in-app page.
 */

const isBuddy = (e: AppEvent) => e.type === 'buddy' || !!e.buddy

export function PublicEventsPage() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<AppEvent[] | null>(null)
  useEffect(() => subscribeEvents(setEvents), [])
  useSeo({
    title: 'Events for College Students – Fests, Garba Nights & Meetups',
    description: 'Find people to go with: fest meetups, garba and dandiya partner nights, treks, study groups and meetups for college students — on DateU.',
    path: '/events',
  })
  if (user && profile?.isProfileComplete) return <Navigate to="/dashboard/events" replace />
  const upcoming = (events || []).filter((e) => eventState(e) === 'upcoming' || eventState(e) === 'live')

  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <div className="mk-wrap">
          <span className="mk-eyebrow">Events</span>
          <h1>Never go <span>alone</span></h1>
          <p className="mk-lead">
            Fests, garba nights, treks and meetups — see who’s going, find a partner or a group, and go together.
          </p>
          {events === null ? (
            <div className="ev-skeletons">{[0, 1].map((i) => <div key={i} className="ev-skeleton" />)}</div>
          ) : upcoming.length === 0 ? (
            <p className="mk-lead">New events are coming soon. Join DateU to hear about them first.</p>
          ) : (
            <div className="ev-list">
              {upcoming.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="ev-card" style={{ textDecoration: 'none' }}>
                  <div className="ev-card-media"><EventCover e={e} /></div>
                  <div className="ev-card-body">
                    <div className="ev-card-kicker">
                      <span className={`ev-tag ${isBuddy(e) ? 'buddy' : ''}`}>{isBuddy(e) ? `Find a ${e.buddyLabel || 'partner'}` : EVENT_TYPES[e.type]?.label}</span>
                    </div>
                    <h3 className="ev-card-title">{e.title}</h3>
                    <div className="ev-card-meta">{formatEventWhen(e)}</div>
                    {(e.venue || e.city) && <div className="ev-card-meta">{[e.venue, e.city].filter(Boolean).join(', ')}</div>}
                    <div className="ev-card-foot"><span className="ev-going-count">{Icon.people} {e.attendeeCount || 0} going</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mk-final">
            <h2>Find your people</h2>
            <p>Join DateU free to say you’re going, see who else is, and make plans together.</p>
            <JoinButton to="/dashboard/events" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export function PublicEventPage() {
  const { id = '' } = useParams()
  const { user, profile } = useAuth()
  const [event, setEvent] = useState<AppEvent | null | undefined>(undefined)
  useEffect(() => subscribeEvent(id, setEvent), [id])

  const buddy = event ? isBuddy(event) : false
  const label = event?.buddyLabel || 'partner'
  useSeo({
    title: event ? `${event.title}${event.city ? ` · ${event.city}` : ''}` : 'Event',
    description: event
      ? `${buddy ? `Find your ${label} for ` : ''}${event.title} — ${formatEventWhen(event)}${event.venue ? ` at ${event.venue}` : ''}. See who’s going and go together on DateU.`
      : undefined,
    path: `/events/${id}`,
    noindex: event === null,
    jsonLd: event ? {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      startDate: new Date(ms(event.startAt)).toISOString(),
      endDate: new Date(ms(event.endAt)).toISOString(),
      eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: event.venue || event.city || 'TBA', address: [event.venue, event.city].filter(Boolean).join(', ') || 'India' },
      description: event.description || event.title,
      url: `${SITE_URL}/events/${event.id}`,
      ...(event.coverUrl ? { image: [event.coverUrl] } : {}),
      organizer: { '@type': 'Organization', name: event.organizer || 'DateU', url: SITE_URL },
    } : undefined,
  })

  // Members go straight to the full event in the app
  if (user && profile?.isProfileComplete) return <Navigate to={`/dashboard/events/${id}`} replace />
  if (event === null) return <Navigate to="/events" replace />

  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <div className="mk-wrap ev-page">
          {event === undefined ? <div className="ev-skeleton tall" /> : (
            <>
              <div className="ev-hero" style={{ margin: '0 0 18px', borderRadius: 22 }}>
                <EventCover e={event} big />
                <div className="ev-hero-shade" />
                <span className="ev-hero-type">{EVENT_TYPES[event.type]?.emoji} {buddy ? `Find a ${label}` : EVENT_TYPES[event.type]?.label}</span>
              </div>
              <h1 className="ev-detail-title">{event.title}</h1>
              {event.organizer && <p className="ev-organizer">by {event.organizer}</p>}
              <div className="ev-facts">
                <div className="ev-fact"><span className="ev-fact-icon">{Icon.calendar}</span><span><strong>{formatEventWhen(event)}</strong></span></div>
                {(event.venue || event.city) && (
                  <div className="ev-fact"><span className="ev-fact-icon">{Icon.pin}</span><span><strong>{event.venue || event.city}</strong>{event.venue && event.city && <small>{event.city}</small>}</span></div>
                )}
                <div className="ev-fact"><span className="ev-fact-icon">{Icon.people}</span><span><strong>{event.attendeeCount || 0} going</strong><small>Join to see who’s going</small></span></div>
                {event.price && <div className="ev-fact"><span className="ev-fact-icon">{Icon.ticket}</span><span><strong>{event.price}</strong></span></div>}
              </div>
              {event.description && <p className="ev-desc" style={{ marginBottom: 20 }}>{event.description}</p>}
              {eventState(event) === 'past' || event.status === 'cancelled' ? (
                <p className="mk-lead">{event.status === 'cancelled' ? 'This event was cancelled.' : 'This event has ended.'} <Link to="/events">See upcoming events →</Link></p>
              ) : (
                <div className="mk-final" style={{ marginTop: 8 }}>
                  <h2>{buddy ? `Find your ${label}` : 'Go with new people'}</h2>
                  <p>Join DateU free, tap “I’m going”, and see who else is going{buddy ? ` — including people looking for a ${label}` : ''}.</p>
                  <JoinButton to={`/dashboard/events/${event.id}`} label="Join DateU & go" />
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
