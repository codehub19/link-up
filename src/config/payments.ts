/**
 * Dynamic plan loading & caching from Firestore.
 * Adds backward-compatible getPlan() (async) for legacy code that used a synchronous helper.
 */

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  DocumentData,
  limit,
  doc,
  getDoc,
} from 'firebase/firestore'
import { getApp } from 'firebase/app'

export interface Plan {
  id: string
  name: string
  price: number              // Rupees
  currency?: string
  matchQuota?: number
  offers?: string[]
  supportAvailable?: boolean
  highlight?: boolean
  displayOrder?: number
  maxPurchasesPerUser?: number
  testOnly?: boolean
  active?: boolean
  description?: string
  amount: number             // alias of price for compatibility
}

let _plansCache: Plan[] = []
let _lastLoaded = 0
let _watchUnsub: (() => void) | null = null
let _loadingPromise: Promise<Plan[]> | null = null

const CACHE_TTL = 60_000 // 1 min

function normalizePlan(id: string, data: DocumentData): Plan | null {
  if (!data) return null
  if (data.active !== true) return null
  const priceRaw = data.price ?? data.amount
  const price = typeof priceRaw === 'number' ? priceRaw : Number(priceRaw)
  if (!price || price <= 0 || !Number.isFinite(price)) return null

  return {
    id,
    name: data.name || id,
    price,
    amount: price,
    currency: data.currency || 'INR',
    matchQuota: typeof data.matchQuota === 'number' ? data.matchQuota : undefined,
    offers: Array.isArray(data.offers) ? data.offers.slice() : undefined,
    supportAvailable: !!data.supportAvailable,
    highlight: !!data.highlight,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 1000,
    maxPurchasesPerUser:
      typeof data.maxPurchasesPerUser === 'number'
        ? data.maxPurchasesPerUser
        : undefined,
    testOnly: !!data.testOnly,
    active: data.active === true,
    description: data.description || '',
  }
}

export async function loadActivePlans(force = false): Promise<Plan[]> {
  if (!force) {
    const age = Date.now() - _lastLoaded
    if (age < CACHE_TTL && _plansCache.length > 0) return _plansCache
  }
  if (_loadingPromise) return _loadingPromise

  const db = getFirestore(getApp())
  const q = query(
    collection(db, 'plans'),
    where('active', '==', true),
    orderBy('displayOrder', 'asc'),
    orderBy('name', 'asc')
  )

  _loadingPromise = getDocs(q)
    .then(snap => {
      const arr: Plan[] = []
      snap.forEach(d => {
        const p = normalizePlan(d.id, d.data())
        if (p) arr.push(p)
      })
      _plansCache = arr
      _lastLoaded = Date.now()
      return arr
    })
    .finally(() => {
      _loadingPromise = null
    })

  return _loadingPromise
}

export function getCachedPlans(): Plan[] {
  return _plansCache
}

export async function getPlanById(planId: string): Promise<Plan | null> {
  if (!planId) return null
  const cached = _plansCache.find(p => p.id === planId)
  if (cached) return cached
  // Direct doc fetch (avoid loading all if single plan needed quickly)
  try {
    const db = getFirestore(getApp())
    const snap = await getDoc(doc(db, 'plans', planId))
    if (!snap.exists()) return null
    const normalized = normalizePlan(snap.id, snap.data())
    if (normalized) {
      // Merge into cache (no reorder)
      _plansCache = [..._plansCache.filter(p => p.id !== normalized.id), normalized]
    }
    return normalized
  } catch {
    return null
  }
}

export function watchActivePlans(callback: (plans: Plan[]) => void): () => void {
  if (_watchUnsub) {
    queueMicrotask(() => callback(_plansCache))
    return _watchUnsub
  }
  const db = getFirestore(getApp())
  const q = query(
    collection(db, 'plans'),
    where('active', '==', true),
    orderBy('displayOrder', 'asc'),
    orderBy('name', 'asc'),
    limit(100)
  )
  _watchUnsub = onSnapshot(
    q,
    snap => {
      const arr: Plan[] = []
      snap.forEach(d => {
        const p = normalizePlan(d.id, d.data())
        if (p) arr.push(p)
      })
      _plansCache = arr
      _lastLoaded = Date.now()
      callback(arr)
    },
    err => console.error('[watchActivePlans] error', err)
  )
  return _watchUnsub
}

export function invalidatePlansCache() {
  _plansCache = []
  _lastLoaded = 0
}

export async function ensurePlans(): Promise<Plan[]> {
  if (_plansCache.length > 0) return _plansCache
  return loadActivePlans()
}

/* --------------------------------------------------------------------------
 * Compatibility Helpers
 * -------------------------------------------------------------------------- */

/**
 * Legacy-style async getPlan; returns the plan or null.
 * (Old code expected synchronous version; update that code to await.)
 */
export async function getPlan(planId: string): Promise<Plan | null> {
  return getPlanById(planId)
}

/**
 * Synchronous cached lookup (returns null if not yet loaded).
 * Useful for conditional rendering while a suspense loader triggers actual fetch.
 */
export function getPlanSyncOrNull(planId: string): Plan | null {
  return _plansCache.find(p => p.id === planId) || null
}


export const UPI_ID = '6221302@ybl'       // TODO: set this
export const UPI_QR_URL = './assets/upi-qr.png' // TODO: ensure file exists at public/assets/upi-qr.png