import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../../components/Navbar'
import EmptyState from '../../../components/ui/EmptyState'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../components/ui/Dialog'
import { subscribeBlockedEitherWay } from '../../../services/blocks'
import { FriendRequest, sendFriendRequest, subscribeMyFriendRequests } from '../../../services/friends'
import {
  AppEvent, Attendee, EVENT_TYPES, downloadIcs, eventState, formatEventWhen, isFull, leaveEvent, registerForEvent,
  subscribeAttendees, subscribeEvent, subscribeMyAttendance, updateMyAttendance,
} from '../../../services/events'
import { EventCover, Icon, Sheet, SponsorAndTickets } from './EventBits'
import './Events.css'
import { photoOf } from '../../../utils/avatar'

type Rel = 'friends' | 'sent' | 'received' | null

export default function EventDetail() {
  const { id = '' } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const { showConfirm } = useDialog()
  const [event, setEvent] = useState<AppEvent | null | undefined>(undefined)
  const [mine, setMine] = useState<Attendee | null | undefined>(undefined)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [sheet, setSheet] = useState<'register' | 'edit' | null>(null)
  const [wantsBuddy, setWantsBuddy] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [onlyBuddies, setOnlyBuddies] = useState(false)
  const [sentNow, setSentNow] = useState<Set<string>>(new Set())

  const uid = user?.uid
  useEffect(() => subscribeEvent(id, setEvent), [id])
  useEffect(() => { if (uid) return subscribeMyAttendance(id, uid, setMine) }, [id, uid])
  const goingNow = !!mine
  useEffect(() => { if (goingNow) return subscribeAttendees(id, setAttendees); setAttendees([]) }, [id, goingNow])
  useEffect(() => { if (uid) return subscribeMyFriendRequests(uid, setRequests) }, [uid])
  useEffect(() => { if (uid) return subscribeBlockedEitherWay(uid, setBlocked) }, [uid])

  const relOf = useMemo(() => {
    const m = new Map<string, Rel>()
    for (const r of requests) {
      const other = r.from === uid ? r.to : r.from
      if (r.status === 'accepted') m.set(other, 'friends')
      else if (r.status === 'pending' && !m.has(other)) m.set(other, r.from === uid ? 'sent' : 'received')
    }
    return m
  }, [requests, uid])

  if (!user) return null
  if (event === undefined) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container ev-page"><div className="ev-skeleton tall" /></div>
      </>
    )
  }
  if (event === null) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container ev-page">
          <EmptyState icon="calendar" title="Event not found" text="It may have been removed." actions={[{ label: 'See all events', to: '/dashboard/events' }]} />
        </div>
      </>
    )
  }

  const t = EVENT_TYPES[event.type] || EVENT_TYPES.meetup
  const buddy = !!event.buddy || event.type === 'buddy'
  const buddyLabel = event.buddyLabel || 'partner'
  const st = eventState(event)
  const full = isFull(event)
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - (event.attendeeCount || 0)) : null
  const isStudent = profile?.userType !== 'general'
  const others = attendees.filter((a) => a.uid !== uid && !blocked.has(a.uid))
  const buddies = others.filter((a) => a.lookingForBuddy)
  const listShown = onlyBuddies ? buddies : others
  const mapHref = event.mapUrl || (event.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.city].filter(Boolean).join(', '))}` : '')

  const openRegister = () => {
    setWantsBuddy(buddy)
    setNote('')
    setSheet('register')
  }

  const register = async () => {
    setBusy(true)
    try {
      await registerForEvent(event, { uid: user.uid, name: profile?.name, photoUrl: profile?.photoUrl, avatar: (profile as any)?.avatar, college: profile?.college, gender: profile?.gender, userType: profile?.userType }, { lookingForBuddy: buddy && wantsBuddy, note })
      setSheet(null)
      toast.success('You’re going! 🎉')
    } catch (e: any) {
      toast.error(isFull(event) ? 'Sorry, this event just filled up.' : 'Could not register. Please try again.')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async () => {
    setBusy(true)
    try {
      await updateMyAttendance(event.id, user.uid, { lookingForBuddy: wantsBuddy, note })
      setSheet(null)
      toast.success('Updated')
    } catch {
      toast.error('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!(await showConfirm(`Not going to ${event.title} anymore?`))) return
    try {
      await leaveEvent(event.id, user.uid)
      toast('You’re no longer going')
    } catch {
      toast.error('Could not update. Please try again.')
    }
  }

  const share = async () => {
    // Public link: opens for anyone, even without an account
    const url = `${window.location.origin}/events/${event.id}`
    const when = formatEventWhen(event)
    const where = event.venue ? ` · ${event.venue}` : ''
    const text = buddy
      ? `${t.emoji} ${event.title}\n${when}${where}\n\nI’m going! Find your ${buddyLabel} and come along on DateU 👋`
      : `${t.emoji} ${event.title}\n${when}${where}\n\nI’m going — join me on DateU and let’s go together 👋`
    try {
      if (navigator.share) await navigator.share({ title: event.title, text, url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copied') }
    } catch { /* cancelled */ }
  }

  const sayHi = async (a: Attendee) => {
    setSentNow((s) => new Set(s).add(a.uid))
    try {
      await sendFriendRequest(user.uid, a.uid, buddy ? `Hi! Want to be ${buddyLabel}s for ${event.title}?` : `Hi! I'm going to ${event.title} too 👋`)
      toast.success(`Said hi to ${a.name || 'them'}`)
    } catch {
      setSentNow((s) => { const n = new Set(s); n.delete(a.uid); return n })
      toast.error('Could not send. Please try again.')
    }
  }

  const action = (a: Attendee) => {
    const rel = relOf.get(a.uid) ?? (sentNow.has(a.uid) ? 'sent' : null)
    if (rel === 'friends') return <Link className="ev-btn sm" to={`/dashboard/chat?with=${encodeURIComponent(a.uid)}`}>Message</Link>
    if (rel === 'sent') return <span className="ev-btn sm ghost disabled">Requested</span>
    if (rel === 'received') return <Link className="ev-btn sm" to="/dashboard/friends">Reply</Link>
    if (!isStudent || a.userType === 'general') return null
    return <button type="button" className="ev-btn sm" onClick={() => sayHi(a)}>Say hi</button>
  }

  let cta: JSX.Element
  if (st === 'cancelled') cta = <div className="ev-cta-note">This event was cancelled.</div>
  else if (st === 'past') cta = <div className="ev-cta-note">This event has ended.</div>
  else if (mine) cta = (
    <div className="ev-cta-going">
      <span className="ev-going-badge">{Icon.check} You’re going</span>
      <button type="button" className="ev-btn ghost" onClick={cancel}>Can’t go</button>
    </div>
  )
  else if (full) cta = <button type="button" className="ev-btn block" disabled>Event full</button>
  else cta = (
    <button type="button" className="ev-btn block" onClick={openRegister} disabled={mine === undefined}>
      {buddy ? `I’m going — find me a ${buddyLabel}` : 'I’m going'}
    </button>
  )

  return (
    <>
      <Navbar />
      <div className="dashboard-container ev-page ev-detail">
        <div className="ev-hero">
          <EventCover e={event} big />
          <div className="ev-hero-shade" />
          <span className="ev-hero-type">{t.emoji} {buddy ? `Find a ${buddyLabel}` : t.label}</span>
        </div>

        <h1 className="ev-detail-title">{event.title}</h1>
        {event.organizer && <p className="ev-organizer">by {event.organizer}</p>}

        <div className="ev-facts">
          <div className="ev-fact">
            <span className="ev-fact-icon">{Icon.calendar}</span>
            <span>
              <strong>{formatEventWhen(event)}</strong>
              {st === 'live' && <small className="live">Happening now</small>}
            </span>
          </div>
          {(event.venue || event.city) && (
            <div className="ev-fact">
              <span className="ev-fact-icon">{Icon.pin}</span>
              <span>
                <strong>{event.venue || event.city}</strong>
                {event.venue && event.city && <small>{event.city}</small>}
                {mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer">Open in Maps</a>}
              </span>
            </div>
          )}
          <div className="ev-fact">
            <span className="ev-fact-icon">{Icon.people}</span>
            <span>
              <strong>{event.attendeeCount || 0} going</strong>
              {spotsLeft !== null && <small>{spotsLeft === 0 ? 'No spots left' : `${spotsLeft} spots left`}</small>}
            </span>
          </div>
          {event.price && (
            <div className="ev-fact">
              <span className="ev-fact-icon">{Icon.ticket}</span>
              <span><strong>{event.price}</strong><small>{event.ticketUrl ? 'Buy tickets from the organiser below' : 'Tickets are handled by the organiser'}</small></span>
            </div>
          )}
        </div>

        <SponsorAndTickets event={event} />

        <div className="ev-actions-row">
          <button type="button" className="ev-btn ghost sm" onClick={share}>{Icon.share} Share</button>
          <button type="button" className="ev-btn ghost sm" onClick={() => downloadIcs(event)}>{Icon.calendar} Add to calendar</button>
        </div>

        {event.description && (
          <section className="ev-block">
            <h2>About</h2>
            <p className="ev-desc">{event.description}</p>
          </section>
        )}

        {buddy && (
          <section className="ev-block ev-how">
            <h2>How finding a {buddyLabel} works</h2>
            <ol>
              <li>Tap <b>I’m going</b> and say you’re looking for a {buddyLabel}.</li>
              <li>See everyone else going — filter to people looking for a {buddyLabel}.</li>
              <li>Say hi. When they accept, chat and plan to meet at the event.</li>
            </ol>
            <p className="ev-safety">Meet in public, stay with your group, and report anyone who makes you uncomfortable.</p>
          </section>
        )}

        <section className="ev-block">
          <div className="ev-block-head">
            <h2>People going</h2>
            {mine && buddy && (
              <button type="button" className="ev-link" onClick={() => { setWantsBuddy(!!mine.lookingForBuddy); setNote(mine.note || ''); setSheet('edit') }}>
                Edit my status
              </button>
            )}
          </div>
          {!mine ? (
            <div className="ev-locked">
              <span className="ev-locked-icon">🔒</span>
              <p>{st === 'past' || st === 'cancelled'
                ? 'The guest list is only visible to people who were going.'
                : buddy ? `Tap “I’m going” to see who’s going and find your ${buddyLabel}.` : 'Tap “I’m going” to see who else is going and say hi.'}</p>
            </div>
          ) : (
            <>
              {mine && buddy && (
                <div className={`ev-mystatus ${mine.lookingForBuddy ? 'on' : ''}`}>
                  {mine.lookingForBuddy ? `You’re looking for a ${buddyLabel}` : `You’re not looking for a ${buddyLabel}`}
                  {mine.note && <small>“{mine.note}”</small>}
                </div>
              )}
              {buddy && others.length > 0 && (
                <div className="ev-chips small">
                  <button type="button" className={`ev-chip ${!onlyBuddies ? 'on' : ''}`} onClick={() => setOnlyBuddies(false)}>Everyone · {others.length}</button>
                  <button type="button" className={`ev-chip ${onlyBuddies ? 'on' : ''}`} onClick={() => setOnlyBuddies(true)}>Looking for a {buddyLabel} · {buddies.length}</button>
                </div>
              )}
              {listShown.length === 0 ? (
                <p className="ev-empty-line">
                  {others.length === 0 ? 'You’re one of the first! Share the event so friends can join.' : `Nobody looking for a ${buddyLabel} yet — check back soon.`}
                </p>
              ) : (
                <div className="ev-people">
                  {listShown.map((a) => (
                    <div key={a.uid} className="ev-person">
                      <button type="button" className="ev-person-main" onClick={() => nav(`/profile/${a.uid}`)}>
                        <span className="ev-avatar">
                          <img src={photoOf(a)} alt="" loading="lazy" />
                        </span>
                        <span className="ev-person-text">
                          <strong>{a.name || 'Student'}{a.lookingForBuddy && buddy && <em>Looking for a {buddyLabel}</em>}</strong>
                          {a.college && <small>{a.college}</small>}
                          {a.note && <span className="ev-person-note">“{a.note}”</span>}
                        </span>
                      </button>
                      {action(a)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="ev-cta">{cta}</div>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} label={sheet === 'edit' ? 'Edit my status' : 'Register'}>
        <h3 className="ev-sheet-title">{sheet === 'edit' ? 'Your status' : `Going to ${event.title}?`}</h3>
        <p className="ev-sheet-sub">
          {sheet === 'edit'
            ? 'Others going can see this.'
            : 'People going can see your first name, photo and college, and say hi. You can change your mind any time.'}
        </p>
        {buddy && (
          <div className="ev-toggle-row">
            <span>
              <strong>I’m looking for a {buddyLabel}</strong>
              <small>Show me in “Looking for a {buddyLabel}”</small>
            </span>
            <button type="button" role="switch" aria-checked={wantsBuddy} className={`ev-switch ${wantsBuddy ? 'on' : ''}`} onClick={() => setWantsBuddy((v) => !v)}>
              <span />
            </button>
          </div>
        )}
        <label className="ev-field">
          <span>{buddy ? 'A line about you (optional)' : 'Say something to others going (optional)'}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            rows={2}
            placeholder={buddy ? 'e.g. Beginner at garba, love dandiya, going with 2 friends' : 'e.g. First time here, happy to join a group!'}
          />
          <small className="ev-count">{note.length}/140</small>
        </label>
        <div className="ev-sheet-actions">
          <button type="button" className="ev-btn ghost" onClick={() => setSheet(null)}>Cancel</button>
          <button type="button" className="ev-btn" onClick={sheet === 'edit' ? saveEdit : register} disabled={busy}>
            {busy ? 'Saving…' : sheet === 'edit' ? 'Save' : 'I’m going'}
          </button>
        </div>
      </Sheet>
    </>
  )
}
