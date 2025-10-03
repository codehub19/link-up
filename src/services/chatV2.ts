import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export type ChatMessage = {
  id: string
  text: string
  senderUid: string
  createdAt: any
  createdAtMs: number
}

export async function createOrTouchThread(matchId: string) {
  const ref = doc(db, 'threads', matchId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { updatedAt: serverTimestamp() } as any)
  } else {
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    })
  }
}

export async function sendMessageByMatchId(
  matchId: string,
  senderUid: string,
  text: string
): Promise<string> {
  const now = Date.now()
  const msgs = collection(db, 'threads', matchId, 'messages')
  const res = await addDoc(msgs, {
    text,
    senderUid,
    createdAt: serverTimestamp(),
    createdAtMs: now,
  })
  // Update thread metadata (allowed for participants by rules)
  const tRef = doc(db, 'threads', matchId)
  await setDoc(
    tRef,
    {
      updatedAt: serverTimestamp(),
      lastMessage: { text, senderUid, at: serverTimestamp() },
    },
    { merge: true }
  )
  return res.id
}

export async function blockUserInThreadByMatchId(matchId: string, blockedUid: string) {
  const ref = doc(db, 'threads', matchId)
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      blocks: { [blockedUid]: true },
    } as any,
    { merge: true }
  )
}

export async function unblockUserInThreadByMatchId(matchId: string, blockedUid: string) {
  const ref = doc(db, 'threads', matchId)
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      blocks: { [blockedUid]: false },
    } as any,
    { merge: true }
  )
}

export async function reportUserFromChat(params: {
  reporterUid: string
  reportedUid: string
  threadId: string // equals matchId
  reason: string
}) {
  const id = `${params.threadId}_${params.reporterUid}_${Date.now()}`
  const ref = doc(db, 'reports', id)
  await setDoc(ref, {
    reporterUid: params.reporterUid,
    reportedUid: params.reportedUid,
    threadId: params.threadId,
    reason: params.reason,
    createdAt: serverTimestamp(),
  })
}