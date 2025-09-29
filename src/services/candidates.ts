import { getActiveRound } from './rounds'
import { getAssignments } from './assignments'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export async function getMaleCandidatesForFemale(femaleUid: string) {
  const active = await getActiveRound()
  if (!active) return []
  const a = await getAssignments(active.id, femaleUid)
  const uids: string[] = (a?.maleCandidates || [])
  if (uids.length > 0) {
    const profiles: any[] = []
    for (const uid of uids.slice(0, 50)) {
      const u = await getDoc(doc(db, 'users', uid))
      if (u.exists()) profiles.push({ uid, ...(u.data() as any) })
    }
    return profiles
  }
  const roundSnap = await getDoc(doc(db, 'matchingRounds', active.id))
  const list = (roundSnap.data() as any)?.participatingMales || []
  const profiles: any[] = []
  for (const uid of list.slice(0, 50)) {
    const u = await getDoc(doc(db, 'users', uid))
    if (u.exists()) profiles.push({ uid, ...(u.data() as any) })
  }
  return profiles
}