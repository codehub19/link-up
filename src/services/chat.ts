import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'

export type ChatMessage = {
  id: string
  text: string
  senderUid: string
  createdAt: any
  createdAtMs?: number
  readBy?: string[]
  type?: 'text' | 'audio'
  audioUrl?: string
  mediaDuration?: number
  likes?: string[]
  isEdited?: boolean
  editedAt?: any
  replyTo?: {
    id: string
    text: string
    senderUid: string
    type?: 'text' | 'audio'
  }
}

export function threadIdFor(u1: string, u2: string) {
  return [u1, u2].sort().join('_')
}

// Creates the thread only if it doesn't exist yet, so opening a chat never wipes
// its createdAt / lastMessage. (Rules allow reading a missing thread named after you.)
export async function ensureThread(currentUid: string, peerUid: string): Promise<string> {
  if (!currentUid || !peerUid) throw new Error('Missing participant uid(s)')
  const id = threadIdFor(currentUid, peerUid)
  const ref = doc(db, 'threads', id)

  // Fast path: it usually exists already
  const snap = await getDoc(ref)
  if (snap.exists()) return id

  // getDoc can wrongly report "missing" while a local write to the thread is
  // pending (e.g. marking it read). A transaction always reads from the server,
  // so an existing thread is never overwritten. Throwing aborts the
  // transaction without sending anything when the thread does exist.
  const EXISTS = new Error('thread-exists')
  try {
    await runTransaction(db, async (tx) => {
      const s = await tx.get(ref)
      if (s.exists()) throw EXISTS
      tx.set(ref, {
        participants: [currentUid, peerUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null,
      })
    })
  } catch (e) {
    if (e !== EXISTS) throw e
  }

  return id
}

export async function sendMessage(
  threadId: string,
  senderUid: string,
  text: string,
  type: 'text' | 'audio' = 'text',
  extra?: { audioUrl?: string, mediaDuration?: number },
  replyTo?: ChatMessage['replyTo']
) {
  const now = Date.now()
  const msgCol = collection(db, 'threads', threadId, 'messages')
  const res = await addDoc(msgCol, {
    text,
    senderUid,
    // Keep both: server timestamp for canonical, client ms for snappy local ordering
    createdAt: serverTimestamp(),
    createdAtMs: now,
    readBy: [senderUid],
    type,
    ...(extra || {}),
    ...(replyTo ? { replyTo } : {})
  })
  const tRef = doc(db, 'threads', threadId)
  await updateDoc(tRef, {
    updatedAt: serverTimestamp(),
    lastMessage: { text: type === 'audio' ? '🎤 Audio Message' : text, senderUid, at: serverTimestamp() }
  })
  return res.id
}

// If you keep this helper, prefer createdAtMs for smooth ordering
export function subscribeMessages(threadId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAtMs', 'asc'))
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ChatMessage[]
    cb(msgs)
  })
}

export async function setTypingStatus(threadId: string, uid: string, isTyping: boolean) {
  const ref = doc(db, 'threads', threadId)
  await updateDoc(ref, {
    [`typing.${uid}`]: isTyping ? serverTimestamp() : false
  })
}

export async function markThreadAsRead(threadId: string, uid: string) {
  const ref = doc(db, 'threads', threadId)
  await updateDoc(ref, {
    [`lastRead.${uid}`]: serverTimestamp()
  })
}

// Basic helper to delete message
import { deleteDoc } from 'firebase/firestore'

export async function deleteMessage(threadId: string, messageId: string) {
  const ref = doc(db, 'threads', threadId, 'messages', messageId)
  await deleteDoc(ref)
}

export async function toggleLikeMessage(threadId: string, messageId: string, uid: string, currentLikes: string[] = []) {
  const ref = doc(db, 'threads', threadId, 'messages', messageId)
  // arrayUnion/arrayRemove so two people liking at once don't overwrite each other
  await updateDoc(ref, {
    likes: currentLikes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid)
  })
}

export async function editMessage(threadId: string, messageId: string, newText: string) {
  const ref = doc(db, 'threads', threadId, 'messages', messageId)
  await updateDoc(ref, {
    text: newText,
    isEdited: true,
    editedAt: serverTimestamp()
  })
}
