import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { isUserAdmin } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'asia-south2'

async function logAdmin(adminUid: string, action: string, targetUid: string | null, details: Record<string, any> = {}) {
  await db.collection('adminLogs').add({
    adminUid,
    action,
    targetUid,
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { })
}

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
  await logAdmin(req.auth!.uid, 'privacy_migration', null, { migrated })
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
  await logAdmin(req.auth!.uid, banned ? 'ban' : 'unban', uid, { reason: reason || null })
  return { ok: true }
})

/* ----------------------------------------------------------------------------
 * setUserAdmin (admin): grant or revoke admin access. You can't remove your own.
 * ------------------------------------------------------------------------- */
export const setUserAdmin = onCall({ region: REGION }, async (req) => {
  const caller = req.auth?.uid
  if (!(await isUserAdmin(caller))) throw new HttpsError('permission-denied', 'Admin only')
  const { uid, isAdmin } = (req.data || {}) as { uid?: string; isAdmin?: boolean }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')
  if (uid === caller && !isAdmin) throw new HttpsError('failed-precondition', "You can't remove your own admin access.")
  await db.collection('users').doc(uid).set({ isAdmin: !!isAdmin }, { merge: true })
  await logAdmin(caller!, isAdmin ? 'grant_admin' : 'revoke_admin', uid)
  return { ok: true }
})

/* ----------------------------------------------------------------------------
 * adminDeleteUser (admin): permanently delete an account — login, profile,
 * private data, call data and uploaded files. Chats/matches are kept for the
 * other person but show the profile as removed.
 * ------------------------------------------------------------------------- */
export const adminDeleteUser = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const caller = req.auth?.uid
  if (!(await isUserAdmin(caller))) throw new HttpsError('permission-denied', 'Admin only')
  const { uid } = (req.data || {}) as { uid?: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')
  if (uid === caller) throw new HttpsError('failed-precondition', "You can't delete your own account here.")

  const name = (await db.collection('users').doc(uid).get()).data()?.name || null
  await Promise.all([
    db.collection('users').doc(uid).delete(),
    db.collection('userPrivate').doc(uid).delete(),
    db.collection('callQueue').doc(uid).delete(),
    db.collection('randomCallStats').doc(uid).delete(),
    db.collection('userBlocks').doc(uid).delete(),
  ])
  try {
    await admin.storage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  } catch { /* no files or bucket not configured */ }
  try {
    await admin.auth().deleteUser(uid)
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') throw new HttpsError('internal', e?.message || 'Failed to delete login')
  }
  await logAdmin(caller!, 'delete_user', uid, { name })
  return { ok: true }
})
