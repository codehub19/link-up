import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { isUserAdmin } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'asia-south2'
const PRIVATE_FIELDS = ['email', 'phoneNumber', 'upiId', 'fcmToken']

/* ----------------------------------------------------------------------------
 * migrateUserPrivateData (admin): move contact details and college ID image URLs
 * from the public users/{uid} profile into userPrivate/{uid}. Safe to run again.
 * ------------------------------------------------------------------------- */
export const migrateUserPrivateData = onCall({ region: REGION, timeoutSeconds: 540 }, async (req) => {
  if (!(await isUserAdmin(req.auth?.uid))) throw new HttpsError('permission-denied', 'Admin only')

  const FieldValue = admin.firestore.FieldValue
  const users = await db.collection('users').get()
  let migrated = 0
  let batch = db.batch()
  let ops = 0

  for (const d of users.docs) {
    const data = d.data()
    const priv: Record<string, any> = {}
    const removals: Record<string, any> = {}

    for (const k of PRIVATE_FIELDS) {
      if (data[k] !== undefined) {
        if (data[k] !== null) priv[k] = data[k]
        removals[k] = FieldValue.delete()
      }
    }
    const cid = data.collegeId
    if (cid && (cid.frontUrl || cid.backUrl)) {
      priv.collegeId = { frontUrl: cid.frontUrl || null, backUrl: cid.backUrl || null }
      removals['collegeId.frontUrl'] = FieldValue.delete()
      removals['collegeId.backUrl'] = FieldValue.delete()
      removals['collegeId.submitted'] = true
    }
    if (Object.keys(removals).length === 0) continue

    batch.set(db.collection('userPrivate').doc(d.id), { ...priv, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    batch.update(d.ref, removals)
    migrated++
    ops += 2
    if (ops >= 400) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }
  if (ops > 0) await batch.commit()
  return { migrated, total: users.size }
})

/* ----------------------------------------------------------------------------
 * setUserBan (admin): ban or unban a user. Banned users can't join random calls
 * or send chat messages.
 * ------------------------------------------------------------------------- */
export const setUserBan = onCall({ region: REGION }, async (req) => {
  if (!(await isUserAdmin(req.auth?.uid))) throw new HttpsError('permission-denied', 'Admin only')
  const { uid, banned, reason } = (req.data || {}) as { uid?: string; banned?: boolean; reason?: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')

  const FieldValue = admin.firestore.FieldValue
  await db.collection('users').doc(uid).set(
    banned
      ? { banned: true, bannedAt: FieldValue.serverTimestamp(), banReason: String(reason || '').slice(0, 300) }
      : { banned: false, bannedAt: FieldValue.delete(), banReason: FieldValue.delete() },
    { merge: true }
  )
  if (banned) await db.collection('callQueue').doc(uid).delete().catch(() => { })
  return { ok: true }
})
