import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

/** FCM tokens for the given users (userPrivate first, legacy users/{uid}.fcmToken as fallback). */
export async function getFcmTokens(uids: string[]): Promise<string[]> {
  const unique = [...new Set(uids.filter(Boolean))]
  const tokens: string[] = []
  for (let i = 0; i < unique.length; i += 300) {
    const chunk = unique.slice(i, i + 300)
    const [privSnaps, userSnaps] = await Promise.all([
      db.getAll(...chunk.map((u) => db.collection('userPrivate').doc(u))),
      db.getAll(...chunk.map((u) => db.collection('users').doc(u))),
    ])
    chunk.forEach((_, idx) => {
      const t = privSnaps[idx].get('fcmToken') || userSnaps[idx].get('fcmToken')
      if (t) tokens.push(t)
    })
  }
  return [...new Set(tokens)]
}

/** Data-only push (the service worker renders it), sent in batches of 500. */
export async function sendPushToUsers(uids: string[], title: string, body: string, link = '/dashboard/notifications') {
  const tokens = await getFcmTokens(uids)
  let sent = 0
  for (let i = 0; i < tokens.length; i += 500) {
    const res = await admin.messaging().sendEachForMulticast({
      tokens: tokens.slice(i, i + 500),
      data: { title, body, click_action: link },
    })
    sent += res.successCount
  }
  return sent
}

export async function isUserAdmin(uid?: string): Promise<boolean> {
  if (!uid) return false
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists && snap.data()?.isAdmin === true
}
