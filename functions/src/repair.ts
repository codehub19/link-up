import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

async function isAdmin(uid?: string) {
  if (!uid) return false
  const u = await db.collection('users').doc(uid).get()
  return !!u.exists && u.data()?.isAdmin === true
}

export const repairUserSubscription = onCall(async (req) => {
  const caller = req.auth?.uid
  if (!await isAdmin(caller)) throw new HttpsError('permission-denied', 'Admin only')
  const { uid } = (req.data || {}) as { uid?: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')

  const pays = await db.collection('payments').where('uid', '==', uid).where('status', '==', 'approved').get()
  if (pays.empty) return { repaired: false, message: 'No approved payments' }

  let total = 0
  let lastPlanId = ''
  for (const d of pays.docs) {
    const p = d.data() as any
    const planId = String(p.planId || '')
    lastPlanId = planId || lastPlanId
    let q = Number(p.matchQuota ?? p.quota ?? 0)
    if (!q && planId) {
      const ps = await db.collection('plans').doc(planId).get()
      if (ps.exists) q = Number((ps.data() as any).matchQuota ?? (ps.data() as any).quota ?? 0)
    }
    if (q > 0) total += q
  }
  if (total <= 0) return { repaired: false, message: 'No quota found' }

  const active = await db.collection('subscriptions').where('uid', '==', uid).where('status', '==', 'active').limit(1).get()
  if (active.empty) {
    await db.collection('subscriptions').add({
      uid, planId: lastPlanId || 'unknown',
      status: 'active', matchQuota: total, remainingMatches: total,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } else {
    await active.docs[0].ref.update({
      status: 'active', matchQuota: total, remainingMatches: total,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
  return { repaired: true, totalQuota: total }
})