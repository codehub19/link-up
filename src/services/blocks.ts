import { arrayRemove, arrayUnion, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type UserBlockDoc = {
  uid: string
  uids?: string[]
  updatedAt?: any
}

export function subscribeBlockedUids(uid: string, cb: (blocked: Set<string>) => void) {
  const ref = doc(db, 'userBlocks', uid)
  return onSnapshot(ref, (snap) => {
    const data = snap.data() as UserBlockDoc | undefined
    cb(new Set(data?.uids ?? []))
  })
}

export function subscribeAmIBlockedBy(peerUid: string, meUid: string, cb: (isBlocked: boolean) => void) {
  const ref = doc(db, 'userBlocks', peerUid)
  return onSnapshot(ref, (snap) => {
    const data = snap.data() as UserBlockDoc | undefined
    cb((data?.uids ?? []).includes(meUid))
  })
}

export async function blockUser(blockerUid: string, blockedUid: string) {
  const ref = doc(db, 'userBlocks', blockerUid)
  await setDoc(
    ref,
    {
      uid: blockerUid,
      uids: arrayUnion(blockedUid),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function unblockUser(blockerUid: string, blockedUid: string) {
  const ref = doc(db, 'userBlocks', blockerUid)
  await updateDoc(ref, { uids: arrayRemove(blockedUid), updatedAt: serverTimestamp() } as any)
}