import { isAdminRequest } from './adminAuth'
import * as admin from 'firebase-admin'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { sendPushToUsers } from './push'
import { notifyUser } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

// This many different people reporting someone within the window hides them until an admin reviews.
const AUTO_HIDE_REPORTERS = 3
const WINDOW_DAYS = 30

async function adminUids() {
  const snap = await db.collection('users').where('isAdmin', '==', true).select().get()
  return snap.docs.map((d) => d.id)
}

/**
 * New report: acknowledge the reporter, alert admins, and automatically hide the
 * reported account once several different people have reported it.
 */
export const onReportCreated = onDocumentCreated(
  { document: 'reports/{id}', region: REGION },
  async (event) => {
    const r = event.data?.data()
    if (!r?.reportedUid || !r.reporterUid) return
    const reportedUid = String(r.reportedUid)

    await event.data!.ref.set({ status: r.status || 'open' }, { merge: true })

    const since = admin.firestore.Timestamp.fromMillis(Date.now() - WINDOW_DAYS * 86_400_000)
    const recent = await db.collection('reports')
      .where('reportedUid', '==', reportedUid)
      .where('createdAt', '>=', since)
      .get()
    const reporters = new Set(recent.docs.filter((d) => d.get('status') !== 'dismissed').map((d) => d.get('reporterUid')))

    const userRef = db.collection('users').doc(reportedUid)
    const user = (await userRef.get()).data() || {}
    let hidden = false
    if (reporters.size >= AUTO_HIDE_REPORTERS && !user.underReview && !user.isAdmin) {
      await userRef.set({ underReview: true, underReviewAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      await db.collection('adminLogs').add({
        adminUid: 'system', action: 'auto_hide', targetUid: reportedUid,
        details: { reporters: reporters.size }, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => { })
      hidden = true
      logger.info('auto-hid reported user', { reportedUid, reporters: reporters.size })
    }

    await notifyUser(String(r.reporterUid), {
      title: 'Thanks for your report',
      body: 'Our team reviews every report, usually within 24 hours. We’ll let you know when we’ve looked into it.',
      link: '/dashboard/notifications',
      push: false,
    })

    const admins = await adminUids()
    const name = String(user.name || 'A user').split(' ')[0]
    await sendPushToUsers(admins, hidden ? `🚩 ${name} auto-hidden (${reporters.size} reports)` : `🚩 New report: ${name}`,
      String(r.reason || '').slice(0, 120), '/admin/reports').catch(() => 0)
  },
)

/** When an admin closes a report, tell the reporter what happened (without details about the other person). */
export const onReportUpdated = onDocumentUpdated(
  { document: 'reports/{id}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!after || before?.status === after.status) return
    if (after.status !== 'actioned' && after.status !== 'dismissed' && after.status !== 'resolved') return
    const actioned = after.status === 'actioned' || after.status === 'resolved'
    await notifyUser(String(after.reporterUid), {
      title: actioned ? '✅ Action taken on your report' : 'We reviewed your report',
      body: actioned
        ? 'Thanks for helping keep DateU safe. We’ve taken action on the account you reported.'
        : 'We looked into it and didn’t find a rule being broken. You can always block someone from their profile.',
      link: '/dashboard/notifications',
      push: true,
    })
  },
)

/** Admin: hide or restore an account (used from the Reports and Users screens). */
export const setUserReview = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { uid, underReview } = (req.data || {}) as { uid?: string; underReview?: boolean }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required')
  await db.collection('users').doc(uid).set({
    underReview: !!underReview,
    underReviewAt: underReview ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
  }, { merge: true })
  await db.collection('adminLogs').add({
    adminUid: req.auth!.uid, action: underReview ? 'hide_user' : 'restore_user', targetUid: uid,
    details: {}, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { })
  return { ok: true }
})
