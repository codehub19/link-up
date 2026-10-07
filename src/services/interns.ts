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
export async function addIntern(email: string, opts: { startDate?: string; endDate?: string; targetSignups?: number; sendOffer?: boolean }) {
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
  role: string; workMode: string; hours: string; stipend: string; acceptDays: number
}
export type InternDocument = {
  id: string; uid: string; type: InternDocType; refNo: string; internNo: string; name: string; college?: string | null; role: string
  startAt: any; endAt: any; issuedAt: any; respondBy?: any; acceptedAt?: any; acceptedName?: string
  settings: LetterSettings; remarks?: string | null
  stats?: { signups: number; completed: number; approvedReports: number; score: number } | null
  status: 'issued' | 'accepted' | 'valid' | 'replaced' | 'revoked'
}
export type InternRecord = {
  uid: string; name: string; email: string; college?: string | null; status: 'active' | 'completed' | 'removed'; code: string
  internNo?: string; startAt?: any; endAt?: any; targets?: { signups?: number }
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
