import { doc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export async function blockUserInThread(threadId: string, blockerUid: string, blockedUserUid: string) {
  const ref = doc(db, 'threads', threadId)
  await updateDoc(ref, {
    blockedUserUid,
    blockedSetByUid: blockerUid,
    blockedAt: serverTimestamp(),
  } as any)
}

export async function unblockUserInThread(threadId: string) {
  const ref = doc(db, 'threads', threadId)
  await updateDoc(ref, {
    blockedUserUid: null,
    blockedSetByUid: null,
    blockedAt: null,
  } as any)
}

export async function reportUser(params: {
  reporterUid: string
  reportedUid: string
  threadId: string
  reason: string
}) {
  // use threadId as part of id for easier dedupe (optional)
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