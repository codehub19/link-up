import { collection, getDocs, limit, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type ActiveSubscription = {
  id: string
  uid: string
  planId: string
  status: 'active' | 'expired'
  remainingMatches: number
  matchQuota: number
  supportAvailable?: boolean
  plan?: {
    id: string
    name: string
    price: number
    matchQuota: number
    offers?: string[]
    supportAvailable?: boolean
  }
}

export async function getActiveSubscription(uid: string): Promise<ActiveSubscription | null> {
  // Avoid composite index: only filter by uid, then pick an active one in code
  const q = query(collection(db, 'subscriptions'), where('uid', '==', uid), limit(10))
  const snap = await getDocs(q)
  if (snap.empty) return null

  const subs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ActiveSubscription[]
  const active = subs.find(s => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0)
              || subs.find(s => s.status === 'active')
              || null
  if (!active) return null

  if (active.planId) {
    const p = await getDoc(doc(db, 'plans', active.planId))
    if (p.exists()) {
      const pd = p.data() as any
      active.plan = {
        id: p.id,
        name: pd.name,
        price: pd.price,
        matchQuota: pd.matchQuota ?? pd.quota,
        offers: pd.offers,
        supportAvailable: pd.supportAvailable
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