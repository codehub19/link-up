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
  const q = query(
    collection(db, 'subscriptions'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const sub = { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as ActiveSubscription
  if (sub.planId) {
    const p = await getDoc(doc(db, 'plans', sub.planId))
    if (p.exists()) {
      const pd = p.data() as any
      sub.plan = { id: p.id, name: pd.name, price: pd.price, matchQuota: pd.matchQuota, offers: pd.offers, supportAvailable: pd.supportAvailable }
    }
  }
  return sub
}

export async function listActivePlans() {
  const q = query(collection(db, 'plans'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}