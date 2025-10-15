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
  roundsUsed?: number
  roundsAllowed?: number
  plan?: {
    id: string
    name: string
    price: number
    matchQuota: number
    roundsAllowed: number
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

  // Ensure roundsAllowed is present in subscription (from plan if missing)
  if (active.planId) {
    const p = await getDoc(doc(db, 'plans', active.planId))
    if (p.exists()) {
      const pd = p.data() as any
      active.plan = {
        id: p.id,
        name: pd.name,
        price: pd.price,
        matchQuota: pd.matchQuota ?? pd.quota,
        roundsAllowed: pd.roundsAllowed ?? 1,
        offers: pd.offers,
        supportAvailable: pd.supportAvailable
      }
      // If subscription roundsAllowed is missing, set from plan
      if (active.roundsAllowed == null && pd.roundsAllowed != null) {
        active.roundsAllowed = pd.roundsAllowed
      }
    }
  }
  // Ensure roundsAllowed is never undefined
  if (active.roundsAllowed == null) active.roundsAllowed = active.plan?.roundsAllowed ?? 1

  return active
}

export async function listActivePlans() {
  const q = query(collection(db, 'plans'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}