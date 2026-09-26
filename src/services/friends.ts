import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { threadIdFor } from './chat'

export type FriendRequest = {
  id: string
  from: string
  to: string
  status: 'pending' | 'accepted' | 'declined'
  message?: string
  createdAt?: any
  respondedAt?: any
}

// Keeps people from spamming requests
export const MAX_PENDING_SENT = 20

const reqId = (from: string, to: string) => `${from}_${to}`

/** Live list of every request I've sent or received. */
export function subscribeMyFriendRequests(uid: string, cb: (all: FriendRequest[]) => void) {
  let sent: FriendRequest[] = []
  let received: FriendRequest[] = []
  const emit = () => cb([...sent, ...received])
  const map = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))
  const a = onSnapshot(query(collection(db, 'friendRequests'), where('from', '==', uid)), (s) => { sent = map(s); emit() }, () => { })
  const b = onSnapshot(query(collection(db, 'friendRequests'), where('to', '==', uid)), (s) => { received = map(s); emit() }, () => { })
  return () => { a(); b() }
}

export async function sendFriendRequest(from: string, to: string, message?: string) {
  const text = (message || '').trim().slice(0, 140)
  await setDoc(doc(db, 'friendRequests', reqId(from, to)), {
    from,
    to,
    status: 'pending',
    createdAt: serverTimestamp(),
    ...(text ? { message: text } : {}),
  })
}

export async function cancelFriendRequest(from: string, to: string) {
  await deleteDoc(doc(db, 'friendRequests', reqId(from, to)))
}

/** Accept a request and open (or mark) the chat between the two of you, in one write. */
export async function acceptFriendRequest(req: FriendRequest) {
  const tid = threadIdFor(req.from, req.to)
  const threadRef = doc(db, 'threads', tid)
  const existing = await getDoc(threadRef).catch(() => null)
  const batch = writeBatch(db)
  batch.update(doc(db, 'friendRequests', req.id), { status: 'accepted', respondedAt: serverTimestamp() })
  if (existing?.exists()) {
    batch.update(threadRef, { friend: true })
  } else {
    batch.set(threadRef, {
      participants: [req.from, req.to],
      source: 'friend',
      friend: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    })
  }
  await batch.commit()
}

export async function declineFriendRequest(req: FriendRequest) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'friendRequests', req.id), { status: 'declined', respondedAt: serverTimestamp() })
  await batch.commit()
}

/** Unfriend: removes the request (either direction). The old chat stays readable. */
export async function removeFriend(me: string, other: string) {
  await Promise.all([
    deleteDoc(doc(db, 'friendRequests', reqId(me, other))).catch(() => { }),
    deleteDoc(doc(db, 'friendRequests', reqId(other, me))).catch(() => { }),
  ])
  // Take it out of the friends chats (it stays if you're also matched)
  await updateDoc(doc(db, 'threads', threadIdFor(me, other)), { friend: false }).catch(() => { })
}

/** Students who turned on Friends (the caller filters out themselves, friends, blocks…). */
export async function listDiscoverableStudents(max = 80) {
  const snap = await getDocs(query(collection(db, 'users'), where('friendsVisible', '==', true), limit(max)))
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))
}
