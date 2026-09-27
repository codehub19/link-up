import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'

export type EventType =
  | 'buddy' | 'fest' | 'meetup' | 'study' | 'sports' | 'trip' | 'music' | 'movie' | 'gaming' | 'workshop' | 'hackathon'

/** Kinds of events, with the look used on cards. */
export const EVENT_TYPES: Record<EventType, { label: string; emoji: string; from: string; to: string }> = {
  buddy: { label: 'Find a partner', emoji: '💃', from: '#f43f5e', to: '#f97316' },
  fest: { label: 'College fest', emoji: '🎪', from: '#8b5cf6', to: '#ec4899' },
  meetup: { label: 'Meetup', emoji: '☕', from: '#f59e0b', to: '#ef4444' },
  study: { label: 'Study group', emoji: '📚', from: '#0ea5e9', to: '#6366f1' },
  sports: { label: 'Sports', emoji: '🏏', from: '#10b981', to: '#0ea5e9' },
  trip: { label: 'Trip & trek', emoji: '🥾', from: '#22c55e', to: '#15803d' },
  music: { label: 'Music & open mic', emoji: '🎤', from: '#a855f7', to: '#6366f1' },
  movie: { label: 'Movie night', emoji: '🎬', from: '#334155', to: '#7c3aed' },
  gaming: { label: 'Gaming', emoji: '🎮', from: '#06b6d4', to: '#8b5cf6' },
  workshop: { label: 'Workshop', emoji: '🛠️', from: '#f97316', to: '#eab308' },
  hackathon: { label: 'Hackathon', emoji: '💻', from: '#2563eb', to: '#14b8a6' },
}

export type EventStatus = 'draft' | 'published' | 'cancelled'

export type AppEvent = {
  id: string
  title: string
  type: EventType
  /** Find-a-buddy event: attendees can say they're looking for a partner */
  buddy?: boolean
  /** e.g. "Garba partner", "trek buddy", "teammate" */
  buddyLabel?: string
  description?: string
  venue?: string
  city?: string
  college?: string
  mapUrl?: string
  startAt: Timestamp
  endAt: Timestamp
  capacity?: number
  attendeeCount?: number
  coverUrl?: string
  /** "Free", "₹199 at the gate", … */
  price?: string
  organizer?: string
  status: EventStatus
  featured?: boolean
  createdAt?: any
  updatedAt?: any
}

export type Attendee = {
  uid: string
  name?: string
  photoUrl?: string
  college?: string
  gender?: string
  userType?: string
  lookingForBuddy?: boolean
  note?: string
  createdAt?: any
}

export const ms = (t: any) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === 'number' ? t : 0)

/** Live list of published (and cancelled) events, soonest first. */
export function subscribeEvents(cb: (events: AppEvent[]) => void) {
  const q = query(collection(db, 'events'), where('status', 'in', ['published', 'cancelled']))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as AppEvent)
    list.sort((a, b) => ms(a.startAt) - ms(b.startAt))
    cb(list)
  }, () => cb([]))
}

export function subscribeEvent(id: string, cb: (e: AppEvent | null) => void) {
  return onSnapshot(doc(db, 'events', id), (s) => cb(s.exists() ? ({ id: s.id, ...(s.data() as any) } as AppEvent) : null), () => cb(null))
}

/** My attendee doc for an event (null when I'm not going). */
export function subscribeMyAttendance(eventId: string, uid: string, cb: (a: Attendee | null) => void) {
  return onSnapshot(doc(db, 'events', eventId, 'attendees', uid), (s) => cb(s.exists() ? (s.data() as Attendee) : null), () => cb(null))
}

export async function getMyAttendance(eventId: string, uid: string) {
  const s = await getDoc(doc(db, 'events', eventId, 'attendees', uid)).catch(() => null)
  return s?.exists() ? (s.data() as Attendee) : null
}

/**
 * Everyone going (only readable once you're going too). Right after registering,
 * the server may not have the registration yet, so a denied read is retried.
 */
export function subscribeAttendees(eventId: string, cb: (list: Attendee[]) => void) {
  let stop: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let tries = 0
  let closed = false
  const listen = () => {
    stop = onSnapshot(collection(db, 'events', eventId, 'attendees'), (snap) => {
      const list = snap.docs.map((d) => d.data() as Attendee)
      list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
      cb(list)
    }, () => {
      if (closed || tries++ >= 5) { cb([]); return }
      timer = setTimeout(() => { if (!closed) listen() }, 800 * tries)
    })
  }
  listen()
  return () => { closed = true; if (timer) clearTimeout(timer); stop?.() }
}

export async function registerForEvent(
  event: AppEvent,
  me: { uid: string; name?: string; photoUrl?: string; college?: string; gender?: string; userType?: string },
  opts: { lookingForBuddy?: boolean; note?: string } = {},
) {
  const note = (opts.note || '').trim().slice(0, 140)
  const batch = writeBatch(db)
  batch.set(doc(db, 'events', event.id, 'attendees', me.uid), {
    uid: me.uid,
    name: (me.name || '').split(' ')[0] || 'Student',
    photoUrl: me.photoUrl || null,
    college: me.college || null,
    gender: me.gender || null,
    userType: me.userType || 'college',
    lookingForBuddy: !!opts.lookingForBuddy,
    ...(note ? { note } : {}),
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'events', event.id), { attendeeCount: increment(1) })
  await batch.commit()
}

export async function updateMyAttendance(eventId: string, uid: string, patch: { lookingForBuddy?: boolean; note?: string }) {
  const clean: Record<string, any> = {}
  if (patch.lookingForBuddy !== undefined) clean.lookingForBuddy = patch.lookingForBuddy
  if (patch.note !== undefined) clean.note = patch.note.trim().slice(0, 140)
  await updateDoc(doc(db, 'events', eventId, 'attendees', uid), clean)
}

export async function leaveEvent(eventId: string, uid: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'events', eventId, 'attendees', uid))
  batch.update(doc(db, 'events', eventId), { attendeeCount: increment(-1) })
  await batch.commit()
}

export async function suggestEvent(uid: string, name: string, data: { title: string; details?: string; when?: string; where?: string; contact?: string }) {
  await addDoc(collection(db, 'eventSuggestions'), {
    uid,
    name: name || '',
    title: data.title.trim().slice(0, 120),
    details: (data.details || '').trim().slice(0, 1000),
    when: (data.when || '').trim().slice(0, 120),
    where: (data.where || '').trim().slice(0, 120),
    contact: (data.contact || '').trim().slice(0, 120),
    status: 'new',
    createdAt: serverTimestamp(),
  })
}

/* ---------------- Helpers ---------------- */

export function eventState(e: AppEvent, now = Date.now()): 'upcoming' | 'live' | 'past' | 'cancelled' {
  if (e.status === 'cancelled') return 'cancelled'
  if (now >= ms(e.endAt)) return 'past'
  if (now >= ms(e.startAt)) return 'live'
  return 'upcoming'
}

export function isFull(e: AppEvent) {
  return !!e.capacity && (e.attendeeCount || 0) >= e.capacity
}

export function formatEventWhen(e: AppEvent) {
  const s = new Date(ms(e.startAt))
  const end = new Date(ms(e.endAt))
  const day = s.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  const t = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const sameDay = s.toDateString() === end.toDateString()
  return sameDay ? `${day} · ${t(s)} – ${t(end)}` : `${day}, ${t(s)} – ${end.toLocaleDateString([], { day: 'numeric', month: 'short' })}`
}

/** Calendar file so people can add the event to their phone calendar. */
export function downloadIcs(e: AppEvent) {
  const f = (t: any) => new Date(ms(t)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s = '') => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const url = `${window.location.origin}/events/${e.id}`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DateU//Events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@dateu.in`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(e.startAt)}`, `DTEND:${f(e.endAt)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc([e.venue, e.city].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc((e.description || '').slice(0, 500) + '\n\n' + url)}`, `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${e.title.replace(/[^\w]+/g, '-').toLowerCase() || 'event'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/* ---------------- Admin ---------------- */

export async function listAllEvents(): Promise<AppEvent[]> {
  const snap = await getDocs(query(collection(db, 'events'), orderBy('startAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as AppEvent)
}

export async function saveEvent(id: string | null, data: Omit<AppEvent, 'id' | 'attendeeCount' | 'createdAt' | 'updatedAt'>) {
  if (id) {
    await updateDoc(doc(db, 'events', id), { ...data, updatedAt: serverTimestamp() })
    return id
  }
  const ref = doc(collection(db, 'events'))
  await setDoc(ref, { ...data, attendeeCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export async function deleteEvent(id: string) {
  await deleteDoc(doc(db, 'events', id))
}

export async function uploadEventCover(eventId: string, file: File) {
  const r = storageRef(storage, `events/${eventId}/cover_${Date.now()}.jpg`)
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' })
  return getDownloadURL(r)
}

export async function listAttendeesAdmin(eventId: string): Promise<Attendee[]> {
  const snap = await getDocs(collection(db, 'events', eventId, 'attendees'))
  return snap.docs.map((d) => d.data() as Attendee)
}

export async function listEventSuggestions() {
  const snap = await getDocs(query(collection(db, 'eventSuggestions'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}

export async function setSuggestionStatus(id: string, status: 'new' | 'done') {
  await updateDoc(doc(db, 'eventSuggestions', id), { status })
}
