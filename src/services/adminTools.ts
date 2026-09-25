import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../firebase'

/* ---------------- Audit log ---------------- */

export async function logAdminAction(action: string, targetUid: string | null, details: Record<string, any> = {}) {
  const adminUid = auth.currentUser?.uid
  if (!adminUid) return
  await addDoc(collection(db, 'adminLogs'), {
    adminUid,
    action,
    targetUid,
    details,
    createdAt: serverTimestamp(),
  }).catch((e) => console.warn('Audit log failed', e))
}

/* ---------------- Users ---------------- */

export type AdminUser = {
  uid: string
  name?: string
  gender?: 'male' | 'female'
  userType?: 'college' | 'general'
  college?: string
  photoUrl?: string
  instagramId?: string
  dob?: string
  isProfileComplete?: boolean
  isPhoneVerified?: boolean
  isAdmin?: boolean
  banned?: boolean
  banReason?: string
  collegeId?: { verified?: boolean; rejected?: boolean; submitted?: boolean; frontUrl?: string; backUrl?: string }
  createdAt?: any
  lastLoginAt?: any
  // from userPrivate
  email?: string
  phoneNumber?: string
  upiId?: string
  [k: string]: any
}

/** All user profiles merged with their private data (email, phone, UPI). */
export async function listAllUsers(): Promise<AdminUser[]> {
  const [usersSnap, privSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'userPrivate')),
  ])
  const priv: Record<string, any> = {}
  privSnap.forEach((d) => { priv[d.id] = d.data() })
  return usersSnap.docs.map((d) => {
    const data = d.data()
    const p = priv[d.id] || {}
    return {
      ...data,
      uid: d.id,
      email: p.email ?? data.email,
      phoneNumber: p.phoneNumber ?? data.phoneNumber,
      upiId: p.upiId ?? data.upiId,
    } as AdminUser
  })
}

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  const [u, p] = await Promise.all([getDoc(doc(db, 'users', uid)), getDoc(doc(db, 'userPrivate', uid))])
  if (!u.exists()) return null
  const data = u.data()
  const pd = p.exists() ? p.data() : {}
  return {
    ...data,
    uid,
    email: pd.email ?? data.email,
    phoneNumber: pd.phoneNumber ?? data.phoneNumber,
    upiId: pd.upiId ?? data.upiId,
    collegeIdImages: pd.collegeId || null,
  } as AdminUser
}

export async function setUserBan(uid: string, banned: boolean, reason?: string) {
  await httpsCallable(functions, 'setUserBan')({ uid, banned, reason })
}

export async function setUserAdmin(uid: string, isAdmin: boolean) {
  await httpsCallable(functions, 'setUserAdmin')({ uid, isAdmin })
}

export async function deleteUserPermanently(uid: string) {
  await httpsCallable(functions, 'adminDeleteUser')({ uid })
}

export async function setCollegeVerification(uid: string, verified: boolean) {
  await setDoc(doc(db, 'users', uid), {
    collegeId: { verified, rejected: !verified },
    updatedAt: serverTimestamp(),
  }, { merge: true })
  await logAdminAction(verified ? 'verify_college_id' : 'reject_college_id', uid)
}

export async function updateUserFields(uid: string, patch: Record<string, any>) {
  await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() })
  await logAdminAction('edit_profile', uid, { fields: Object.keys(patch) })
}

export async function resetCallsToday(uid: string) {
  await setDoc(doc(db, 'randomCallStats', uid), { calls: 0 }, { merge: true })
  await logAdminAction('reset_calls', uid)
}

/** In-app notification + push to a single user. */
export async function notifyUser(uid: string, title: string, body: string) {
  await addDoc(collection(db, 'notifications'), {
    title,
    body,
    userUid: uid,
    createdAt: serverTimestamp(),
    targetType: 'personal',
    seen: false,
  })
  await httpsCallable(functions, 'sendPushNotification')({ userUids: [uid], title, body }).catch(() => { })
  await logAdminAction('notify_user', uid, { title })
}

/* ---------------- Subscriptions ---------------- */

const DAY_MS = 86_400_000

async function syncPremiumUntil(uid: string) {
  // Public read-only marker used to show Premium members first (see functions/src/premium.ts)
  const subs = await getDocs(query(collection(db, 'subscriptions'), where('uid', '==', uid)))
  const now = Date.now()
  const latest = subs.docs
    .map((d) => d.data())
    .filter((d) => d.status === 'active' && (toMillis(d.expiresAt) === 0 || toMillis(d.expiresAt) > now))
    .map((d) => d.expiresAt)
    .sort((a, b) => toMillis(b) - toMillis(a))[0] || null
  await setDoc(doc(db, 'users', uid), { premiumUntil: latest }, { merge: true })
}

/** Give (or extend) Premium for free. Extends the current end date if already Premium. */
export async function grantSubscription(uid: string, planId: string, days: number, note?: string) {
  const subs = await getDocs(query(collection(db, 'subscriptions'), where('uid', '==', uid)))
  const now = Date.now()
  const active = subs.docs.find((d) => d.data().status === 'active' && toMillis(d.data().expiresAt) > now)
  if (active) {
    const expiresAt = Timestamp.fromMillis(toMillis(active.data().expiresAt) + days * DAY_MS)
    await updateDoc(active.ref, { expiresAt, planId, updatedAt: serverTimestamp() })
  } else {
    const plan = (await getDoc(doc(db, 'plans', planId))).data() || {}
    await addDoc(collection(db, 'subscriptions'), {
      uid,
      planId,
      status: 'active',
      startsAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + days * DAY_MS),
      durationDays: days,
      supportAvailable: !!plan.supportAvailable,
      grantedByAdmin: true,
      note: note || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  await syncPremiumUntil(uid)
  await logAdminAction('grant_premium', uid, { planId, days })
}

export async function setSubscriptionStatus(subId: string, uid: string, status: 'active' | 'expired') {
  const patch: Record<string, any> = { status, updatedAt: serverTimestamp() }
  if (status === 'active') {
    // Reactivating an ended plan gives it 30 days from now
    const cur = (await getDoc(doc(db, 'subscriptions', subId))).data()
    if (!cur || toMillis(cur.expiresAt) <= Date.now()) patch.expiresAt = Timestamp.fromMillis(Date.now() + 30 * DAY_MS)
  }
  await updateDoc(doc(db, 'subscriptions', subId), patch)
  await syncPremiumUntil(uid)
  await logAdminAction(status === 'active' ? 'reactivate_premium' : 'expire_premium', uid, { subId })
}

/** Add days to a plan (from its current end date, or from now if it already ended). */
export async function extendSubscription(subId: string, uid: string, days: number) {
  const cur = (await getDoc(doc(db, 'subscriptions', subId))).data() || {}
  const base = Math.max(Date.now(), toMillis(cur.expiresAt))
  await updateDoc(doc(db, 'subscriptions', subId), {
    status: 'active',
    expiresAt: Timestamp.fromMillis(base + days * DAY_MS),
    updatedAt: serverTimestamp(),
  })
  await syncPremiumUntil(uid)
  await logAdminAction('extend_premium', uid, { subId, days })
}

/* ---------------- Calls ---------------- */

export async function endCallAsAdmin(callId: string) {
  await updateDoc(doc(db, 'randomCalls', callId), {
    status: 'ended',
    endedAt: serverTimestamp(),
    endedBy: 'admin',
    endReason: 'admin',
  })
  await logAdminAction('end_call', null, { callId })
}

/* ---------------- App settings ---------------- */

export type AppConfig = {
  maintenanceMode?: boolean
  maintenanceMessage?: string
  signupsPaused?: boolean
  announcement?: { active?: boolean; text?: string; link?: string; tone?: 'info' | 'warning' | 'success' }
}

export async function getConfigDoc<T = Record<string, any>>(path: 'config/app' | 'config/randomCall' | 'serverConfig/turn'): Promise<T> {
  const snap = await getDoc(doc(db, path))
  return (snap.exists() ? snap.data() : {}) as T
}

export async function saveConfigDoc(path: 'config/app' | 'config/randomCall' | 'serverConfig/turn', data: Record<string, any>) {
  await setDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() }, { merge: true })
  // Never log secrets
  const safe = path === 'serverConfig/turn' ? { fields: Object.keys(data) } : data
  await logAdminAction('update_settings', null, { path, ...safe })
}

/* ---------------- Helpers ---------------- */

export function toMillis(t: any): number {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t.seconds) return t.seconds * 1000
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  return 0
}

export function formatDate(t: any, withTime = false) {
  const ms = toMillis(t)
  if (!ms) return '—'
  const d = new Date(ms)
  return withTime ? d.toLocaleString() : d.toLocaleDateString()
}

export function timeAgo(t: any) {
  const ms = toMillis(t)
  if (!ms) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Download rows as a CSV file (values are quoted; formulas neutralised). */
export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: any) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
