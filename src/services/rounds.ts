import {
  collection, getDocs, query, where, doc, setDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export async function getActiveRound() {
  const q = query(collection(db, 'matchingRounds'), where('isActive', '==', true))
  const snap = await getDocs(q)
  return snap.docs[0] ? { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } : null
}

export async function listRounds() {
  const snap = await getDocs(collection(db, 'matchingRounds'))
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function createRound(roundId: string) {
  const ref = doc(db, 'matchingRounds', roundId)
  await setDoc(ref, {
    roundId,
    isActive: false,
    participatingMales: [],
    participatingFemales: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function setActiveRound(roundId: string | '') {
  const batch = writeBatch(db)
  const all = await getDocs(collection(db, 'matchingRounds'))
  all.forEach(docSnap => {
    const ref = doc(db, 'matchingRounds', docSnap.id)
    batch.update(ref, { isActive: roundId !== '' && docSnap.id === roundId })
  })
  await batch.commit()
}