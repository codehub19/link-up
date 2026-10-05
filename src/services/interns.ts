import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where,
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
export async function addIntern(email: string, endDate?: string, targetSignups?: number) {
  const r: any = await httpsCallable(functions, 'addIntern')({ email, endDate, targetSignups })
  return r.data as { uid: string; code: string }
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
