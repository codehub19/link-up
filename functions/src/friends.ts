import * as admin from 'firebase-admin'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { sendPushToUsers } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

const firstName = async (uid: string) => String((await db.collection('users').doc(uid).get()).get('name') || 'A student').split(' ')[0]

async function notify(uid: string, title: string, body: string) {
  await db.collection('notifications').add({
    userUid: uid, title, body, targetType: 'personal', seen: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await sendPushToUsers([uid], title, body, '/dashboard/friends').catch(() => 0)
}

/** Tell someone they got a friend request. */
export const onFriendRequestCreated = onDocumentCreated(
  { document: 'friendRequests/{id}', region: REGION },
  async (event) => {
    const r = event.data?.data()
    if (!r || r.status !== 'pending') return
    const name = await firstName(r.from)
    await notify(r.to, `👋 ${name} wants to be friends`, r.message ? `“${String(r.message).slice(0, 100)}”` : 'Open Friends to accept or decline.')
  },
)

/** Tell the sender when their request is accepted. */
export const onFriendRequestUpdated = onDocumentUpdated(
  { document: 'friendRequests/{id}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!after || before?.status === 'accepted' || after.status !== 'accepted') return
    const name = await firstName(after.to)
    await notify(after.from, `🎉 You and ${name} are now friends`, 'Say hi in Chat.')
  },
)
