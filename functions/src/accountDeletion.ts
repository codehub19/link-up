import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

// Requests are processed after this grace period (so a mistaken request can be cancelled via support)
const GRACE_MS = 2 * 86_400_000

async function deleteQuery(q: FirebaseFirestore.Query, onDoc?: (d: FirebaseFirestore.QueryDocumentSnapshot) => Promise<void>) {
  let n = 0
  for (;;) {
    const snap = await q.limit(300).get()
    if (snap.empty) return n
    const batch = db.batch()
    for (const d of snap.docs) {
      if (onDoc) await onDoc(d)
      batch.delete(d.ref)
    }
    await batch.commit()
    n += snap.size
    if (snap.size < 300) return n
  }
}

/**
 * Permanently delete a user's data (DPDP Act "right to erasure").
 * Kept: payment records without the screenshot (tax law) and reports about others (safety).
 */
export async function deleteUserData(uid: string) {
  const bucket = admin.storage().bucket()
  const counts: Record<string, number> = {}

  // Files: profile photos, college ID, voice notes, payment screenshots
  for (const prefix of [`users/${uid}/`, `chat-audio/${uid}/`, `payments/${uid}/`]) {
    await bucket.deleteFiles({ prefix, force: true }).catch((e) => logger.warn('storage delete', prefix, e?.message))
  }

  // Friend requests both ways
  counts.friendRequestsFrom = await deleteQuery(db.collection('friendRequests').where('from', '==', uid))
  counts.friendRequestsTo = await deleteQuery(db.collection('friendRequests').where('to', '==', uid))

  // Event sign-ups (keep the going count right)
  counts.events = await deleteQuery(db.collectionGroup('attendees').where('uid', '==', uid), async (d) => {
    const eventRef = d.ref.parent.parent
    if (eventRef) await eventRef.update({ attendeeCount: admin.firestore.FieldValue.increment(-1) }).catch(() => { })
  })

  // Group memberships and posts
  counts.groupPosts = await deleteQuery(db.collectionGroup('posts').where('authorUid', '==', uid))
  const groups = await db.collection('groups').where('memberUids', 'array-contains', uid).get()
  for (const g of groups.docs) {
    await g.ref.update({ memberUids: admin.firestore.FieldValue.arrayRemove(uid), memberCount: admin.firestore.FieldValue.increment(-1) }).catch(() => { })
  }

  // Messages they sent; their chats are marked so the other person sees "Deleted user"
  const threads = await db.collection('threads').where('participants', 'array-contains', uid).get()
  let messages = 0
  for (const t of threads.docs) {
    messages += await deleteQuery(t.ref.collection('messages').where('senderUid', '==', uid))
    await t.ref.set({ deletedUsers: admin.firestore.FieldValue.arrayUnion(uid), lastMessage: null }, { merge: true }).catch(() => { })
  }
  counts.messages = messages

  // Notifications, call data, profile views, blocks
  counts.notifications = await deleteQuery(db.collection('notifications').where('userUid', '==', uid))
  counts.views = await deleteQuery(db.collection('profileViews').where('viewerUid', '==', uid))
  counts.viewsOf = await deleteQuery(db.collection('profileViews').where('viewedUid', '==', uid))
  for (const ref of [
    db.collection('userPrivate').doc(uid),
    db.collection('userBlocks').doc(uid),
    db.collection('randomCallStats').doc(uid),
    db.collection('callQueue').doc(uid),
    db.collection('users').doc(uid),
  ]) await ref.delete().catch(() => { })

  // Payments: keep the record (amount/date, needed for accounts) but drop the screenshot link
  const payments = await db.collection('payments').where('uid', '==', uid).get()
  for (const p of payments.docs) await p.ref.update({ proofUrl: admin.firestore.FieldValue.delete(), screenshotUrl: admin.firestore.FieldValue.delete(), userDeleted: true }).catch(() => { })

  // Sign-in account last
  await admin.auth().deleteUser(uid).catch((e) => { if (e?.code !== 'auth/user-not-found') throw e })
  return counts
}

/** Daily: delete accounts whose deletion request is older than the grace period. */
export const processAccountDeletions = onSchedule({ schedule: '30 3 * * *', timeZone: 'Asia/Kolkata', region: REGION, timeoutSeconds: 540 }, async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - GRACE_MS)
  const due = await db.collection('account_delete_requests').where('status', '==', 'pending').get()
  for (const req of due.docs) {
    const at = req.get('requestedAt') as admin.firestore.Timestamp | undefined
    if (at && at.toMillis() > cutoff.toMillis()) continue
    try {
      const counts = await deleteUserData(req.id)
      await req.ref.update({ status: 'done', doneAt: admin.firestore.FieldValue.serverTimestamp(), email: admin.firestore.FieldValue.delete(), phoneNumber: admin.firestore.FieldValue.delete(), counts })
      logger.info('account deleted', { uid: req.id, counts })
    } catch (e: any) {
      logger.error('account deletion failed', { uid: req.id, error: e?.message })
      await req.ref.update({ lastError: String(e?.message || e) }).catch(() => { })
    }
  }
})
