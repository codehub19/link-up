import { addDoc, collection, serverTimestamp, doc as docRef, getDocs, limitToLast, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase'

export interface NotificationPayload {
    userUid: string
    title: string
    body: string
}

/**
 * Sends a notification to a specific user (In-App + Push).
 */
export async function sendNotification({ userUid, title, body }: NotificationPayload) {
    try {
        // 1. Add to Firestore (In-App History)
        await addDoc(collection(db, 'notifications'), {
            title,
            body,
            userUid,
            createdAt: serverTimestamp(),
            targetType: 'personal',
            seen: false
        })

        // 2. Send Push Notification (Cloud Function)
        const functions = getFunctions(undefined, 'asia-south2')
        const sendPush = httpsCallable(functions, 'sendPushNotification')

        // Cloud function expects 'userUids' array
        await sendPush({ userUids: [userUid], title, body })

    } catch (error) {
        console.error('Failed to send notification:', error)
        // Swallow error so we don't block the calling flow (e.g. payment approval)
    }
}

/* ---------------- Unread state (bell dot) ---------------- */

const SEEN_KEY = 'dateu.notificationsSeenAt'
const SEEN_EVENT = 'dateu:notifications-seen'

function msOf(t: any): number {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t.seconds) return t.seconds * 1000
  if (typeof t === 'number') return t
  return 0
}

/** When the user last opened Notifications (profile value or this device, whichever is newer). */
export function getNotificationsSeenAt(profileValue?: any): number {
  let local = 0
  try { local = Number(localStorage.getItem(SEEN_KEY) || 0) } catch { /* private mode */ }
  return Math.max(local, msOf(profileValue))
}

/** Marks every personal notification as seen and records the time for broadcasts. */
export async function markNotificationsSeen(uid: string) {
  const now = Date.now()
  try { localStorage.setItem(SEEN_KEY, String(now)) } catch { /* private mode */ }
  window.dispatchEvent(new Event(SEEN_EVENT))

  const unseen = await getDocs(query(collection(db, 'notifications'), where('userUid', '==', uid), where('seen', '==', false)))
  for (let i = 0; i < unseen.docs.length; i += 400) {
    const batch = writeBatch(db)
    unseen.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { seen: true, seenAt: serverTimestamp() }))
    await batch.commit()
  }
  await updateDoc(docRef(db, 'users', uid), { notificationsSeenAt: serverTimestamp() })
}

/**
 * Calls back with true while there is something unread: a personal notification that
 * hasn't been seen, or a broadcast newer than the last visit (and newer than the account).
 */
export function subscribeUnread(uid: string, opts: { joinedAtMs: number; profileSeenAt?: any }, cb: (unread: boolean) => void) {
  let personal = false
  let latestBroadcast = 0
  const emit = () => {
    const seenAt = Math.max(getNotificationsSeenAt(opts.profileSeenAt), opts.joinedAtMs)
    cb(personal || latestBroadcast > seenAt)
  }
  const stopPersonal = onSnapshot(
    query(collection(db, 'notifications'), where('userUid', '==', uid), where('seen', '==', false)),
    (s) => { personal = !s.empty; emit() },
    () => { personal = false; emit() }
  )
  const stopBroadcast = onSnapshot(
    query(collection(db, 'notifications'), where('userUid', '==', null), orderBy('createdAt', 'asc'), limitToLast(1)),
    (s) => { latestBroadcast = s.empty ? 0 : msOf(s.docs[0].data().createdAt); emit() },
    () => { latestBroadcast = 0; emit() }
  )
  window.addEventListener(SEEN_EVENT, emit)
  return () => { stopPersonal(); stopBroadcast(); window.removeEventListener(SEEN_EVENT, emit) }
}
