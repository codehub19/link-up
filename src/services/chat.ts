import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type ChatMessage = {
  id: string
  text: string
  senderUid: string
  createdAt: any
  readBy?: string[]
}

export function threadIdFor(u1: string, u2: string) {
  return [u1, u2].sort().join('_')
}

export async function ensureThread(currentUid: string, peerUid: string): Promise<string> {
  const id = threadIdFor(currentUid, peerUid)
  const ref = doc(db, 'threads', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [currentUid, peerUid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    })
  }
  return id
}

export async function sendMessage(threadId: string, senderUid: string, text: string) {
  const msgCol = collection(db, 'threads', threadId, 'messages')
  const res = await addDoc(msgCol, {
    text,
    senderUid,
    createdAt: serverTimestamp(),
    readBy: [senderUid],
  })
  const tRef = doc(db, 'threads', threadId)
  await updateDoc(tRef, {
    updatedAt: serverTimestamp(),
    lastMessage: { text, senderUid, at: serverTimestamp() }
  })
  return res.id
}

export function subscribeMessages(threadId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ChatMessage[]
    cb(msgs)
  })
}