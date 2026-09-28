import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { notifyUser } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/** Someone tapped "I'm in" on a group plan: tell the author. */
export const onGroupPostUpdated = onDocumentUpdated(
  { document: 'groups/{groupId}/posts/{postId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    const was: string[] = before.inUids || []
    const added = (after.inUids || []).filter((u: string) => !was.includes(u))
    if (!added.length || !after.authorUid) return

    const [who, group] = await Promise.all([
      db.collection('users').doc(added[0]).get(),
      db.collection('groups').doc(event.params.groupId).get(),
    ])
    const name = String(who.get('name') || 'Someone').split(' ')[0]
    const text = String(after.text || '').slice(0, 60)
    await notifyUser(String(after.authorUid), {
      title: `${name} is in! 🙌`,
      body: `For “${text}”${group.exists ? ` in ${group.get('name')}` : ''}. Say hi and make the plan.`,
      link: `/dashboard/groups/${event.params.groupId}`,
    })
  }
)
