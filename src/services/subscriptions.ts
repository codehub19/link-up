import { collection, getDocs, limit, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type ActiveSubscription = {
  id: string
  uid: string
  planId: string
  status: 'active' | 'expired'
  startsAt?: any
  /** Premium is time-based: active until this moment */
  expiresAt?: any
  durationDays?: number
  supportAvailable?: boolean
  grantedByAdmin?: boolean
  // Legacy (plans used to be sold by match count)
  remainingMatches?: number
  matchQuota?: number
  plan?: {
    id: string
    name: string
    price: number
    durationDays?: number
    offers?: string[]
    supportAvailable?: boolean
  }
}

export function toMillis(t: any): number {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (t.seconds) return t.seconds * 1000
  if (typeof t === 'number') return t
  return 0
}

/** Mirrors isSubActive in functions/src/premium.ts */
export function isSubscriptionActive(sub: any, now = Date.now()): boolean {
  if (!sub || sub.status !== 'active') return false
  const exp = toMillis(sub.expiresAt)
  return exp === 0 || exp > now
}

export function formatPremiumUntil(sub: ActiveSubscription | null) {
  const exp = toMillis(sub?.expiresAt)
  return exp ? new Date(exp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null
}

export async function getActiveSubscription(uid: string): Promise<ActiveSubscription | null> {
  // Avoid composite index: only filter by uid, then pick an active one in code
  const q = query(collection(db, 'subscriptions'), where('uid', '==', uid), limit(20))
  const snap = await getDocs(q)
  if (snap.empty) return null

  const subs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ActiveSubscription[]
  const active = subs
    .filter(s => isSubscriptionActive(s))
    .sort((a, b) => toMillis(b.expiresAt) - toMillis(a.expiresAt))[0] || null
  if (!active) return null

  if (active.planId) {
    const p = await getDoc(doc(db, 'plans', active.planId))
    if (p.exists()) {
      const pd = p.data() as any
      active.plan = {
        id: p.id,
        name: pd.name,
        price: pd.price,
        durationDays: pd.durationDays,
        offers: pd.offers,
        supportAvailable: pd.supportAvailable,
      }
    }
  }
  return active
}

export async function listActivePlans() {
  const q = query(collection(db, 'plans'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}