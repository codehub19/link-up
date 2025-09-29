import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function createMatch(roundId: string, maleUid: string, femaleUid: string) {
  const id = `${roundId}_${maleUid}_${femaleUid}`
  const ref = doc(db, 'matches', id)
  await setDoc(
    ref,
    {
      roundId,
      participants: [maleUid, femaleUid],
      boyUid: maleUid,
      girlUid: femaleUid,
      status: 'confirmed',
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )
}