import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// List raw likes a specific girl created in a given round
export async function listLikesByGirl(roundId: string, girlUid: string) {
  const q = query(
    collection(db, 'likes'),
    where('roundId', '==', roundId),
    where('likingUserUid', '==', girlUid)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

// Same as above but enrich each like with the boy's user profile
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