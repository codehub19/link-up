import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, increment, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { track } from '../utils/analytics'

/*
 * Interest groups: "Gym buddies", "Weekend treks", "Startup people"…
 *   groups/{id}         { name, emoji, description, category, memberUids[], memberCount, order, active }
 *   groups/{id}/posts   { authorUid, authorName, authorPhoto, authorCollege, text, when?, inUids[], inCount, createdAt }
 * A post is a plan ("Anyone up for badminton Sat 7am?"). Others tap "I'm in";
 * the author is notified and can say hi to them.
 */

export type Group = {
  id: string
  name: string
  emoji?: string
  description?: string
  category?: string
  memberUids?: string[]
  memberCount?: number
  order?: number
  active?: boolean
}

export type GroupPost = {
  id: string
  authorUid: string
  authorName?: string
  authorPhoto?: string | null
  authorAvatar?: any
  authorCollege?: string | null
  text: string
  when?: string
  inUids: string[]
  inCount: number
  createdAt?: Timestamp
}

/** Posts older than this drop off the feed */
export const POST_TTL_DAYS = 14

export const STARTER_GROUPS: Omit<Group, 'id'>[] = [
  { name: 'Gym & fitness buddies', emoji: '🏋️', category: 'Sports', description: 'Find a workout partner and keep each other going.' },
  { name: 'Badminton, football & more', emoji: '🏸', category: 'Sports', description: 'Short a player? Post the game here.' },
  { name: 'Weekend treks & trips', emoji: '🏔️', category: 'Travel', description: 'Plan trips and treks with people who actually go.' },
  { name: 'Cafés & food walks', emoji: '☕', category: 'Food', description: 'New café, street food, a long chai — come along.' },
  { name: 'Study & exam buddies', emoji: '📚', category: 'Study', description: 'Library sessions, GRE/CAT/GATE prep, placements.' },
  { name: 'Startups & building things', emoji: '🚀', category: 'Career', description: 'Find co-founders, hackathon teams and side projects.' },
  { name: 'Music & jamming', emoji: '🎸', category: 'Music', description: 'Jam sessions, gigs and concert buddies.' },
  { name: 'Movies & shows', emoji: '🎬', category: 'Fun', description: 'First-day-first-show plans and watch parties.' },
  { name: 'Gaming', emoji: '🎮', category: 'Fun', description: 'Squad up — BGMI, Valorant, FIFA, chess.' },
  { name: 'Dance & fests', emoji: '💃', category: 'Culture', description: 'Fest plans, dance practice and garba partners.' },
  { name: 'Photography & art', emoji: '📸', category: 'Culture', description: 'Photo walks, sketching and gallery visits.' },
  { name: 'Books & writing', emoji: '📖', category: 'Culture', description: 'Book swaps, reading clubs and open mics.' },
]

export function subscribeGroups(cb: (groups: Group[]) => void) {
  return onSnapshot(
    query(collection(db, 'groups'), where('active', '==', true)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))),
    () => cb([]),
  )
}

export function subscribeGroup(id: string, cb: (g: Group | null) => void) {
  return onSnapshot(doc(db, 'groups', id), (s) => cb(s.exists() ? ({ id: s.id, ...(s.data() as any) }) : null), () => cb(null))
}

export function subscribePosts(groupId: string, cb: (posts: GroupPost[]) => void) {
  const since = Timestamp.fromMillis(Date.now() - POST_TTL_DAYS * 86_400_000)
  return onSnapshot(
    query(collection(db, 'groups', groupId, 'posts'), where('createdAt', '>=', since), orderBy('createdAt', 'desc'), limit(100)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    () => cb([]),
  )
}

export async function joinGroup(groupId: string, uid: string) {
  track('group_joined', { group: groupId })
  await updateDoc(doc(db, 'groups', groupId), { memberUids: arrayUnion(uid), memberCount: increment(1) })
}

export async function leaveGroup(groupId: string, uid: string) {
  await updateDoc(doc(db, 'groups', groupId), { memberUids: arrayRemove(uid), memberCount: increment(-1) })
}

export async function createPost(groupId: string, me: { uid: string; name?: string; photoUrl?: string | null; avatar?: any; college?: string | null }, text: string, when?: string) {
  const w = (when || '').trim().slice(0, 60)
  track('group_post', { group: groupId })
  await addDoc(collection(db, 'groups', groupId, 'posts'), {
    authorUid: me.uid,
    authorName: (me.name || 'Student').split(' ')[0],
    authorPhoto: me.photoUrl || null,
    ...(me.avatar ? { authorAvatar: me.avatar } : {}),
    authorCollege: me.college || null,
    text: text.trim().slice(0, 280),
    ...(w ? { when: w } : {}),
    inUids: [],
    inCount: 0,
    createdAt: serverTimestamp(),
  })
}

export async function setImIn(groupId: string, postId: string, uid: string, isIn: boolean) {
  if (isIn) track('group_im_in', { group: groupId })
  await updateDoc(doc(db, 'groups', groupId, 'posts', postId), {
    inUids: isIn ? arrayUnion(uid) : arrayRemove(uid),
    inCount: increment(isIn ? 1 : -1),
  })
}

export async function deletePost(groupId: string, postId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'posts', postId))
}

/* ---- Admin ---- */
export async function saveGroup(id: string | null, data: Partial<Group>) {
  const { id: _omit, memberUids: _m, memberCount: _c, ...rest } = data as any
  if (id) await updateDoc(doc(db, 'groups', id), rest)
  else await addDoc(collection(db, 'groups'), { ...rest, memberUids: [], memberCount: 0, active: rest.active ?? true, createdAt: serverTimestamp() })
}

export async function seedStarterGroups() {
  let i = 0
  for (const g of STARTER_GROUPS) {
    const id = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const ref = doc(db, 'groups', id)
    const order = i++
    if ((await getDoc(ref)).exists()) continue // never reset an existing group's members
    await setDoc(ref, { ...g, order, active: true, memberUids: [], memberCount: 0, createdAt: serverTimestamp() })
  }
}
