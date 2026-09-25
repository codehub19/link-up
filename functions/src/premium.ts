import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

export const DEFAULT_PREMIUM_DAYS = 30
const DAY_MS = 86_400_000

function ms(t: any): number {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  return 0
}

/**
 * Premium is time-based: active while status is 'active' and expiresAt is in the future.
 * Older subscriptions without expiresAt count as active until the expiry job gives them one.
 */
export function isSubActive(sub: any, now = Date.now()): boolean {
  if (!sub || sub.status !== 'active') return false
  const exp = ms(sub.expiresAt)
  return exp === 0 || exp > now
}

export async function getActivePremium(uid: string): Promise<(Record<string, any> & { id: string }) | null> {
  const snap = await db.collection('subscriptions').where('uid', '==', uid).limit(20).get()
  const active = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((s) => isSubActive(s))
    .sort((a, b) => ms(b.expiresAt) - ms(a.expiresAt))
  return active[0] || null
}

/** Uids of everyone with active Premium (for priority ordering). */
export async function getPremiumUids(): Promise<Set<string>> {
  const snap = await db.collection('subscriptions').where('status', '==', 'active').get()
  return new Set(snap.docs.filter((d) => isSubActive(d.data())).map((d) => String(d.data().uid)))
}

/**
 * Public, read-only marker on the profile so other users' screens can show Premium
 * members first (subscriptions themselves are private). Only the server/admins can
 * write it (see protectedUserKeys in firestore.rules).
 */
export async function setPremiumUntil(uid: string, expiresAt: admin.firestore.Timestamp | null) {
  await db.collection('users').doc(uid).set({ premiumUntil: expiresAt }, { merge: true })
}

/**
 * Start or extend Premium for `days`. Extending adds to the current end date so
 * nobody loses time they already paid for.
 */
export async function grantPremiumDays(uid: string, planId: string, days: number, extra: Record<string, any> = {}) {
  const FieldValue = admin.firestore.FieldValue
  const current = await getActivePremium(uid)
  const now = Date.now()
  if (current) {
    const base = Math.max(now, ms(current.expiresAt) || now)
    const expiresAt = admin.firestore.Timestamp.fromMillis(base + days * DAY_MS)
    await db.collection('subscriptions').doc(current.id).update({
      planId,
      expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    })
    await setPremiumUntil(uid, expiresAt)
    return { subscriptionId: current.id, expiresAt }
  }
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + days * DAY_MS)
  const ref = await db.collection('subscriptions').add({
    uid,
    planId,
    status: 'active',
    startsAt: FieldValue.serverTimestamp(),
    expiresAt,
    durationDays: days,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...extra,
  })
  await setPremiumUntil(uid, expiresAt)
  return { subscriptionId: ref.id, expiresAt }
}
