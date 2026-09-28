import * as admin from 'firebase-admin'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { notifyUser } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

const firstName = async (uid: string) => String((await db.collection('users').doc(uid).get()).get('name') || 'A student').split(' ')[0]

/** Tell someone they got a friend request. */
export const onFriendRequestCreated = onDocumentCreated(
  { document: 'friendRequests/{id}', region: REGION },
  async (event) => {
    const r = event.data?.data()
    if (!r || r.status !== 'pending') return
    const name = await firstName(r.from)
    const body = r.message ? `“${String(r.message).slice(0, 100)}”` : 'Open Friends to accept or decline.'
    await notifyUser(r.to, {
      title: `👋 ${name} wants to be friends`, body, link: '/dashboard/friends',
      email: { subject: `${name} wants to be friends on DateU 👋`, text: `${name} sent you a friend request. ${r.message ? body + ' ' : ''}Accept it to start chatting.`, cta: 'See request' },
    })
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
    await notifyUser(after.from, {
      title: `🎉 You and ${name} are now friends`, body: 'Say hi in Chat.', link: `/dashboard/chat?with=${after.to}`,
      email: { subject: `${name} accepted your friend request 🎉`, text: `You and ${name} are now friends on DateU. Send the first message!`, cta: 'Say hi' },
    })
  },
)
