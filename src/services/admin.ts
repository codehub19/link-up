import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export async function listFemaleUsers() {
  const q = query(collection(db, 'users'), where('gender', '==', 'female'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }))
}