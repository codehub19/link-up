import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
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

// Write-first creation (no pre-read)
export async function ensureThread(currentUid: string, peerUid: string): Promise<string> {
  if (!currentUid || !peerUid) throw new Error('Missing participant uid(s)')
  const id = threadIdFor(currentUid, peerUid)
  const ref = doc(db, 'threads', id)

  await setDoc(
    ref,
    {
      participants: [currentUid, peerUid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    },
    { merge: true }
  )

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

export async function toggleLikeMessage(threadId: string, messageId: string, uid: string, currentLikes: string[] = []) {
  const ref = doc(db, 'threads', threadId, 'messages', messageId)
  const isLiked = currentLikes.includes(uid)
  if (isLiked) {
    await updateDoc(ref, {
      likes: currentLikes.filter(u => u !== uid)
    })
  } else {
    await updateDoc(ref, {
      likes: [...currentLikes, uid]
    })
  }
}