import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type ChatMessage = {
  id: string
  text: string
  senderUid: string
  createdAt: any
  createdAtMs?: number
  readBy?: string[]
}

export function threadIdFor(u1: string, u2: string) {
  return [u1, u2].sort().join('_')
}

// Safe for strict rules:
// - Try updating an existing thread WITHOUT touching participants.
// - If missing, create with sorted participants and timestamps.
export async function ensureThread(currentUid: string, peerUid: string): Promise<string> {
  if (!currentUid || !peerUid) throw new Error('Missing participant uid(s)')
  const id = threadIdFor(currentUid, peerUid)
  const ref = doc(db, 'threads', id)

  try {
    await updateDoc(ref, { updatedAt: serverTimestamp() } as any)
    return id
  } catch {
    await setDoc(ref, {
      participants: [currentUid, peerUid].sort(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    })
    return id
  }
}

export async function sendMessage(threadId: string, senderUid: string, text: string) {
  const now = Date.now()
  const msgCol = collection(db, 'threads', threadId, 'messages')
  const res = await addDoc(msgCol, {
    text,
    senderUid,
    createdAt: serverTimestamp(),  // required by your rules
    createdAtMs: now,              // for smooth local ordering
    readBy: [senderUid],
  })

  const tRef = doc(db, 'threads', threadId)
  await updateDoc(tRef, {
    updatedAt: serverTimestamp(),
    lastMessage: { text, senderUid, at: serverTimestamp() },
  } as any)

  return res.id
}

export function subscribeMessages(threadId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAtMs', 'asc'))
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ChatMessage[]
    cb(msgs)
  })
}

// Optional helper to confirm thread exists and is shaped correctly before sending
export async function verifyThreadExists(threadId: string) {
  const ref = doc(db, 'threads', threadId)
  const snap = await getDoc(ref)
  return snap.exists()
}