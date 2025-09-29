import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export async function getAssignments(roundId: string, girlUid: string) {
  const ref = doc(db, 'matchingRounds', roundId, 'assignments', girlUid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as any) : { maleCandidates: [] }
}

export async function setAssignments(roundId: string, girlUid: string, maleCandidates: string[]) {
  const ref = doc(db, 'matchingRounds', roundId, 'assignments', girlUid)
  await setDoc(ref, { girlUid, maleCandidates, updatedAt: serverTimestamp() }, { merge: true })
}