import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// List all likes a girl created (used for girls round admin curation)
export async function listLikesByGirl(roundId: string, girlUid: string) {
  const q = query(
    collection(db, 'likes'),
    where('roundId', '==', roundId),
    where('likingUserUid', '==', girlUid)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

// List all likes a boy created (potentially for future features or analytics)
export async function listLikesByBoy(roundId: string, boyUid: string) {
  const q = query(
    collection(db, 'likes'),
    where('roundId', '==', roundId),
    where('likingUserUid', '==', boyUid)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

// Same as listLikesByGirl but enrich each like with the boy's user profile
export async function listLikesByGirlWithProfiles(roundId: string, girlUid: string) {
  const likes = await listLikesByGirl(roundId, girlUid)
  const uniqueBoyUids = Array.from(new Set(likes.map(l => l.likedUserUid)))
  const profiles: Record<string, any> = {}

  // Fetch up to N profiles (sequential to avoid hammering)
  for (const uid of uniqueBoyUids) {
    const s = await getDoc(doc(db, 'users', uid))
    if (s.exists()) profiles[uid] = { uid, ...(s.data() as any) }
  }

  return likes.map(l => ({
    ...l,
    boyProfile: profiles[l.likedUserUid] || { uid: l.likedUserUid },
  }))
}

// [Optional] For admin: get boys who liked a girl (for curation)
// export async function getBoysWhoLikedGirl(roundId: string, girlUid: string): Promise<string[]> {
//   const likes = await listLikesByGirl(roundId, girlUid)
//   return Array.from(new Set(likes.map(l => l.likedUserUid)))
// }

export async function getBoysWhoLikedGirl(roundId: string, girlUid: string): Promise<string[]> {
  const q = query(
    collection(db, 'likes'),
    where('roundId', '==', roundId),
    where('likedUserUid', '==', girlUid)
  )
  const snap = await getDocs(q)
  return Array.from(new Set(snap.docs.map(d => d.data().likingUserUid)))
}