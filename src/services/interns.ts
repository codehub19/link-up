import {
  addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, functions, storage } from '../firebase'

/* Business-development internship: see functions/src/interns.ts */

export const REPORT_TYPES = {
  social_post: { label: 'Social media post', emoji: '📱' },
  whatsapp: { label: 'WhatsApp / Telegram share', emoji: '💬' },
  event: { label: 'Event / meetup', emoji: '🎉' },
  poster: { label: 'Posters / QR codes', emoji: '🪧' },
  outreach: { label: 'Talked to students / clubs', emoji: '🤝' },
  partnership: { label: 'Club / fest partnership', emoji: '🏆' },
  content: { label: 'Reel / video / design', emoji: '🎬' },
  other: { label: 'Other', emoji: '✨' },
} as const
export type ReportType = keyof typeof REPORT_TYPES

export type InternStats = { signups: number; completed: number; points: number; score: number }
export type InternMe = InternStats & {
  uid: string; name: string; email: string; college?: string | null; code: string; status: string
  targets?: { signups?: number }; rank: number; total: number; startAt: number | null; endAt: number | null
  approvedReports: number; pendingReports: number; reports: number
  track?: InternTrackKey; roleTitle?: string; stipend?: string | null; phone?: string
  internNo?: string; documents?: Partial<Record<'offer' | 'completion' | 'certificate', string>>; offerAcceptedAt?: unknown
}
export type LeaderRow = InternStats & { uid: string; name: string; college?: string | null }
export type InternTask = { id: string; title: string; description?: string; points?: number; dueAt?: any; assignees?: 'all' | string[]; createdAt?: any }
export type InternReport = {
  id: string; uid: string; type: ReportType; title: string; description?: string; link?: string | null; proofUrl?: string | null
  reach?: number | null; taskId?: string | null; status: 'pending' | 'approved' | 'changes'; points?: number; feedback?: string; createdAt?: any
}

export const inviteLink = (code: string) => `https://dateu.in/?ref=${encodeURIComponent(code)}`

export async function loadInternDashboard() {
  const r: any = await httpsCallable(functions, 'internDashboard')({})
  return r.data as { me: InternMe; leaderboard: LeaderRow[]; scoring: { completed: number; signup: number } }
}

export function subscribeMyReports(uid: string, cb: (r: InternReport[]) => void) {
  return onSnapshot(query(collection(db, 'internReports'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => cb([]))
}

export function subscribeTasks(cb: (t: InternTask[]) => void) {
  return onSnapshot(query(collection(db, 'internTasks'), orderBy('createdAt', 'desc'), limit(100)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => cb([]))
}

export async function uploadProof(uid: string, file: Blob) {
  const r = ref(storage, `interns/${uid}/${Date.now()}.jpg`)
  await uploadBytes(r, file, { contentType: (file as any).type || 'image/jpeg' })
  return getDownloadURL(r)
}

export async function submitReport(uid: string, data: { type: ReportType; title: string; description?: string; link?: string; proofUrl?: string | null; reach?: number | null; taskId?: string | null }) {
  const link = (data.link || '').trim()
  await addDoc(collection(db, 'internReports'), {
    uid,
    type: data.type,
    title: data.title.trim().slice(0, 120),
    description: (data.description || '').trim().slice(0, 2000),
    link: link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : null,
    proofUrl: data.proofUrl || null,
    reach: Number.isFinite(data.reach as number) && (data.reach as number) >= 0 ? Math.round(data.reach as number) : null,
    taskId: data.taskId || null,
    status: 'pending',
    points: 0,
    createdAt: serverTimestamp(),
  })
}

export async function deleteReport(id: string) {
  await deleteDoc(doc(db, 'internReports', id))
}

/* ---- Admin ---- */
export async function addIntern(email: string, opts: { uid?: string; startDate?: string; endDate?: string; targetSignups?: number; sendOffer?: boolean; track?: InternTrackKey; stipend?: string }) {
  const r: any = await httpsCallable(functions, 'addIntern')({ email, ...opts })
  return r.data as { uid: string; code: string; internNo: string; offerId: string | null }
}
export async function loadInternOverview() {
  const r: any = await httpsCallable(functions, 'adminInternOverview')({})
  return r.data.interns as (InternMe & { lastActiveAt: number | null })[]
}
export function subscribeReportsForReview(status: 'pending' | 'all', cb: (r: InternReport[]) => void) {
  const q = status === 'pending'
    ? query(collection(db, 'internReports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(200))
    : query(collection(db, 'internReports'), orderBy('createdAt', 'desc'), limit(300))
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => cb([]))
}
export async function reviewReport(id: string, adminUid: string, decision: 'approved' | 'changes', points: number, feedback: string) {
  await updateDoc(doc(db, 'internReports', id), {
    status: decision, points: decision === 'approved' ? Math.max(0, Math.round(points)) : 0,
    feedback: feedback.trim().slice(0, 500), reviewedAt: serverTimestamp(), reviewedBy: adminUid,
  })
}
export async function createTask(t: { title: string; description?: string; points?: number; dueAt?: Date | null }) {
  await addDoc(collection(db, 'internTasks'), {
    title: t.title.trim(), description: (t.description || '').trim(), points: Number(t.points) || 0,
    dueAt: t.dueAt || null, assignees: 'all', createdAt: serverTimestamp(),
  })
}
export async function deleteTask(id: string) {
  await deleteDoc(doc(db, 'internTasks', id))
}
/** Admin: change an intern's profile or stipend (used on documents issued from now on). */
export async function setInternRole(uid: string, track: InternTrackKey, stipend: string) {
  await updateDoc(doc(db, 'interns', uid), { track, roleTitle: INTERN_TRACKS[track].title, stipend: stipend.trim().slice(0, 200) || null })
}
/** Admin: upload the signature image printed on letters and certificates. */
export async function uploadSignature(file: Blob) {
  const r = ref(storage, `branding/signature-${Date.now()}.png`)
  await uploadBytes(r, file, { contentType: (file as any).type || 'image/png' })
  return getDownloadURL(r)
}
export async function setInternStatus(uid: string, status: 'active' | 'completed' | 'removed') {
  await updateDoc(doc(db, 'interns', uid), { status })
}

/* ---- Documents: offer letter, completion letter, certificate ---- */

export type InternDocType = 'offer' | 'completion' | 'certificate'
export const DOC_INFO: Record<InternDocType, { title: string; emoji: string; when: string }> = {
  offer: { title: 'Offer letter', emoji: '📄', when: 'Issued when you join' },
  completion: { title: 'Completion letter', emoji: '📜', when: 'Issued when you finish the internship' },
  certificate: { title: 'Certificate of completion', emoji: '🏅', when: 'Issued when you finish the internship' },
}
export type LetterSettings = {
  companyName: string; website: string; email: string; address: string; signatoryName: string; signatoryTitle: string
  signatureUrl?: string; workMode: string; hours: string; stipend: string; acceptDays: number
}

/** Internship profiles; the letter text for each lives in functions/src/internTracks.ts (keep keys and titles in sync). */
export const INTERN_TRACKS = {
  business_development: { title: 'Business Development Intern', department: 'Growth & Partnerships' },
  campus_ambassador: { title: 'Campus Ambassador', department: 'Community' },
  marketing: { title: 'Marketing & Social Media Intern', department: 'Marketing' },
  content_design: { title: 'Content & Graphic Design Intern', department: 'Brand & Design' },
  software: { title: 'Software Development Intern', department: 'Engineering' },
  operations: { title: 'Operations & Community Intern', department: 'Operations' },
} as const
export type InternTrackKey = keyof typeof INTERN_TRACKS
export const roleTitleOf = (r?: { roleTitle?: string | null; track?: string | null } | null) =>
  r?.roleTitle || INTERN_TRACKS[(r?.track || '') as InternTrackKey]?.title || 'Business Development Intern'
export type TrackSnapshot = { key: string; title: string; department: string; summary: string; responsibilities: string[]; learning: string[]; completion: string }
export type InternDocument = {
  id: string; uid: string; type: InternDocType; refNo: string; internNo: string; name: string; college?: string | null; role: string
  startAt: any; endAt: any; issuedAt: any; respondBy?: any; acceptedAt?: any; acceptedName?: string
  settings: LetterSettings & { role?: string }; remarks?: string | null; track?: TrackSnapshot
  stats?: { signups: number; completed: number; approvedReports: number; score: number } | null
  status: 'issued' | 'accepted' | 'valid' | 'replaced' | 'revoked'
}
export type InternRecord = {
  uid: string; name: string; email: string; college?: string | null; status: 'active' | 'completed' | 'removed'; code: string
  internNo?: string; startAt?: any; endAt?: any; targets?: { signups?: number }
  track?: InternTrackKey; roleTitle?: string; stipend?: string | null
  docName?: string; phone?: string; linkedin?: string; docsIssued?: boolean; documents?: Partial<Record<InternDocType, string>>
}

export const verifyLink = (id: string) => `https://dateu.in/verify/${id}`
/** Documents that still count (not withdrawn or replaced by a newer copy). */
export const isLive = (d: InternDocument) => d.status !== 'revoked' && d.status !== 'replaced'

export function subscribeIntern(uid: string, cb: (r: InternRecord | null) => void) {
  return onSnapshot(doc(db, 'interns', uid), (s) => cb(s.exists() ? ({ uid: s.id, ...(s.data() as any) }) : null), () => cb(null))
}
export function subscribeMyDocuments(uid: string, cb: (d: InternDocument[]) => void) {
  return onSnapshot(query(collection(db, 'internDocuments'), where('uid', '==', uid), limit(50)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => tsToMs(b.issuedAt) - tsToMs(a.issuedAt))), () => cb([]))
}
export async function getInternDocument(id: string) {
  const s = await getDoc(doc(db, 'internDocuments', id))
  return s.exists() ? ({ id: s.id, ...(s.data() as any) } as InternDocument) : null
}
export async function saveMyInternDetails(uid: string, d: { docName?: string; phone?: string; linkedin?: string }) {
  await updateDoc(doc(db, 'interns', uid), { ...d, updatedAt: serverTimestamp() })
}
export async function acceptOffer(id: string, fullName: string) {
  await httpsCallable(functions, 'acceptInternOffer')({ id, fullName })
}
export async function verifyDocument(id: string) {
  const r: any = await httpsCallable(functions, 'verifyInternDocument')({ id })
  return r.data as { found: false } | {
    found: true; type: InternDocType; refNo: string; internNo: string; name: string; role: string
    startAt: number | null; endAt: number | null; issuedAt: number | null; status: InternDocument['status']
  }
}
export async function issueDocument(uid: string, type: InternDocType, remarks?: string) {
  const r: any = await httpsCallable(functions, 'issueInternDocument')({ uid, type, remarks })
  return r.data as { id: string; refNo: string }
}
export async function revokeDocument(id: string) {
  await httpsCallable(functions, 'revokeInternDocument')({ id })
}
export async function loadLetterSettings() {
  const s = await getDoc(doc(db, 'internMeta', 'settings'))
  return (s.data() || {}) as Partial<LetterSettings>
}
export async function saveLetterSettings(s: Partial<LetterSettings>) {
  await setDoc(doc(db, 'internMeta', 'settings'), s, { merge: true })
}

export const tsToMs = (t: any): number => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === 'number' ? t : 0)

/** LinkedIn "Add licence or certification" link, pre-filled. */
export function linkedInAddUrl(d: InternDocument) {
  const issued = new Date(tsToMs(d.issuedAt) || Date.now())
  const p = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME', name: `${d.role} — Certificate of Completion`, organizationName: 'DateU',
    issueYear: String(issued.getFullYear()), issueMonth: String(issued.getMonth() + 1),
    certUrl: `https://dateu.in/certificate/${d.id}`, certId: d.refNo,
  })
  return `https://www.linkedin.com/profile/add?${p}`
}

/* ---- Joining requests: selected candidates ask to join at dateu.in/intern; an admin approves ---- */

export type InternRequest = {
  uid: string; email: string; name: string; college: string; year?: string; phone: string; linkedin?: string
  track: InternTrackKey; source?: string; applicationId?: string; note?: string
  status: 'pending' | 'approved' | 'rejected'; reason?: string | null; createdAt?: any; updatedAt?: any
}
export const REQUEST_SOURCES = ['Unstop', 'LinkedIn', 'Referred by someone', 'Email from DateU', 'Other'] as const

export function subscribeMyRequest(uid: string, cb: (r: InternRequest | null) => void) {
  return onSnapshot(doc(db, 'internRequests', uid), (s) => cb(s.exists() ? (s.data() as InternRequest) : null), () => cb(null))
}
/** Sends (or re-sends) the request; a full overwrite so an earlier decision's fields are cleared. */
export async function submitJoinRequest(uid: string, email: string, f: Omit<InternRequest, 'uid' | 'email' | 'status' | 'createdAt' | 'updatedAt' | 'reason'>) {
  const clean = (x?: string, n = 120) => String(x || '').trim().replace(/\s+/g, ' ').slice(0, n)
  const li = clean(f.linkedin, 200)
  const data: Record<string, unknown> = {
    uid, email,
    name: clean(f.name, 60), college: clean(f.college, 120), year: clean(f.year, 30), phone: clean(f.phone, 20),
    linkedin: li, track: f.track, source: clean(f.source, 40), applicationId: clean(f.applicationId, 60), note: String(f.note || '').trim().slice(0, 500),
    status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'internRequests', uid), data)
}
export function subscribeJoinRequests(cb: (r: InternRequest[]) => void) {
  return onSnapshot(query(collection(db, 'internRequests'), orderBy('createdAt', 'desc'), limit(200)),
    (s) => cb(s.docs.map((d) => d.data() as InternRequest)), () => cb([]))
}
export async function rejectJoinRequest(uid: string, reason: string) {
  await httpsCallable(functions, 'rejectInternRequest')({ uid, reason })
}
