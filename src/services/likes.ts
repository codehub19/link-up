import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export async function listLikesByGirl(roundId: string, girlUid: string) {
  const q = query(collection(db, 'likes'),
    where('roundId','==',roundId),
    where('likerUid','==',girlUid)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}