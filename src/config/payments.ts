// Central plan definitions used by the frontend payment UI.
// NOTE:
// - 'amount' is the field your Razorpay order creation currently uses.
// - Firestore plan docs may store 'price'; we keep both for flexibility.
// - If you later decide to load plans dynamically from Firestore, keep this
//   file as a fallback or for type definitions.

export type Plan = {
  id: string
  name: string
  amount: number              // INR (whole rupees) used for payment initiation
  price?: number              // Optional mirror of Firestore 'price'
  description?: string
  matchQuota?: number
  offers?: string[]
  supportAvailable?: boolean
  active?: boolean
}

// Updated to reflect your Firestore "pro" plan document.
export const PLANS: Plan[] = [
  {
    id: 'pro',                // Firestore doc id should ideally also be 'pro'
    name: 'pro',
    amount: 99,               // equals price
    price: 99,
    description: 'Access to one active round with limited quota.',
    matchQuota: 2,
    offers: [
      'one girl match',
      'participation in one round only',
      'one night dinner',
    ],
    supportAvailable: true,
    active: true,
  },
  {
    id: 'starter',
    name: 'starter',
    amount: 49,
    price: 49,
    description: 'More matches & priority (example values – adjust).',
    matchQuota: 1, // adjust to the real quota you want
    offers: [
      'priority matching',
      'more girl matches',
      'unlimited active rounds (example)',
      'priority support',
    ],
    supportAvailable: true,
    active: true,
  },

  // OPTIONAL: If other parts of your code still reference 'basic', you can
  // temporarily alias it to 'pro' by uncommenting below. Remove once all
  // references are migrated to 'pro'.
  /*
  {
    id: 'basic',
    name: 'pro',
    amount: 99,
    price: 99,
    description: 'Alias of pro (temporary).',
    matchQuota: 2,
    offers: [
      'one girl match',
      'participation in one round only',
      'one night dinner',
    ],
    supportAvailable: true,
    active: true,
  }
  */
]

// Helper: retrieve a plan by id. If not found, optionally construct a custom one.
export function getPlan(planId: string, fallbackAmount?: number): Plan {
  const found = PLANS.find(p => p.id === planId)
  if (found) return found

  const amt = typeof fallbackAmount === 'number' && fallbackAmount > 0 ? fallbackAmount : 0
  return {
    id: planId,
    name: planId,
    amount: amt,
    price: amt,
    description: 'Custom plan',
    active: true,
  }
}

// Utility: if you load a Firestore plan doc and want to normalize it:
export function normalizeFirestorePlan(id: string, data: any): Plan {
  const amount = typeof data?.price === 'number' ? data.price : (typeof data?.amount === 'number' ? data.amount : 0)
  return {
    id,
    name: data?.name || id,
    amount,
    price: data?.price ?? amount,
    description: data?.description || '',
    matchQuota: data?.matchQuota,
    offers: Array.isArray(data?.offers) ? data.offers.slice() : undefined,
    supportAvailable: !!data?.supportAvailable,
    active: data?.active !== false,
  }
}