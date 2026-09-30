import { isAdminRequest } from './adminAuth'
import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { emailHtml, notifyUser, sendEmail } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/** Admin → App Controls → "Send test email": checks the Brevo settings end to end. */
export const sendTestEmail = onCall({ region: REGION }, async (req) => {
  if (!(isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const priv = await db.collection('userPrivate').doc(req.auth!.uid).get()
  const email = String((req.data as any)?.to || priv.get('email') || req.auth?.token?.email || '')
  if (!email) throw new HttpsError('failed-precondition', 'No email address to send to')
  const ok = await sendEmail({ email }, 'DateU test email ✅', emailHtml({
    heading: 'Email alerts are working',
    text: 'This is a test from Admin → App Controls. Members will get emails like this for friend requests and event reminders.',
  }), 'test')
  if (!ok) throw new HttpsError('failed-precondition', 'Email was not sent. Check that it is enabled, the Brevo API key is right and the sender address is verified in Brevo (see function logs).')
  return { ok: true, to: email }
})

const IST = 5.5 * 3_600_000

/** Every day at 10:00 IST: remind everyone going to an event that starts tomorrow. */
export const remindEventsTomorrow = onSchedule({ schedule: '0 10 * * *', timeZone: 'Asia/Kolkata', region: REGION, timeoutSeconds: 540 }, async () => {
  // Tomorrow 00:00 → 24:00 in India
  const nowIst = new Date(Date.now() + IST)
  const startIst = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + 1)
  const from = admin.firestore.Timestamp.fromMillis(startIst - IST)
  const to = admin.firestore.Timestamp.fromMillis(startIst - IST + 86_400_000)

  const events = await db.collection('events').where('startAt', '>=', from).where('startAt', '<', to).get()
  let sent = 0
  for (const ev of events.docs) {
    if (ev.get('status') !== 'published') continue
    const title = String(ev.get('title') || 'your event')
    const at = (ev.get('startAt') as admin.firestore.Timestamp).toDate()
    const time = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    const venue = ev.get('venue') ? ` at ${ev.get('venue')}` : ''
    const attendees = await ev.ref.collection('attendees').get()
    for (const a of attendees.docs) {
      if (a.get('remindedAt')) continue
      await notifyUser(a.id, {
        title: `Tomorrow: ${title}`,
        body: `${time}${venue}. See who else is going and make a plan to meet.`,
        link: `/dashboard/events/${ev.id}`,
        email: {
          subject: `Tomorrow: ${title} 🎉`,
          heading: `${title} is tomorrow`,
          text: `It starts at ${time}${venue}. Open the event to see who else is going${ev.get('buddy') ? ' and find a buddy to go with' : ''}.`,
          cta: 'See who’s going',
        },
      })
      await a.ref.set({ remindedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      sent++
    }
  }
  logger.info('[remindEventsTomorrow]', { events: events.size, sent })
})
