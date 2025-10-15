import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// For boys: fetch their assigned girls for this round (top-level map)
export async function getAssignedGirlsForBoy(roundId: string, boyUid: string) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  if (!roundSnap.exists()) return []
  const data = roundSnap.data()
  return data?.assignedGirlsToBoys?.[boyUid] || []
}

// For girls: fetch their assigned boys for this round (top-level map)
export async function getAssignedBoysForGirl(roundId: string, girlUid: string) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  if (!roundSnap.exists()) return []
  const data = roundSnap.data()
  return data?.assignedBoysToGirls?.[girlUid] || []
}

// Set assignments for a boy (assign girls to boy) -- update top-level map
export async function setAssignedGirlsForBoy(roundId: string, boyUid: string, girlCandidates: string[]) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  let assignedGirlsToBoys: { [key: string]: string[] } = {}
  if (roundSnap.exists()) {
    assignedGirlsToBoys = roundSnap.data().assignedGirlsToBoys || {}
  }
  assignedGirlsToBoys[boyUid] = girlCandidates
  await setDoc(roundRef, { assignedGirlsToBoys, updatedAt: serverTimestamp() }, { merge: true })
}

// Set assignments for a girl (assign boys to girl) -- update top-level map
export async function setAssignedBoysForGirl(roundId: string, girlUid: string, boyCandidates: string[]) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  let assignedBoysToGirls: { [key: string]: string[] } = {}
  if (roundSnap.exists()) {
    assignedBoysToGirls = roundSnap.data().assignedBoysToGirls || {}
  }
  assignedBoysToGirls[girlUid] = boyCandidates
  await setDoc(roundRef, { assignedBoysToGirls, updatedAt: serverTimestamp() }, { merge: true })
}

// Fallback: for legacy use, fetch male candidates assigned to a girl (subcollection)
export async function getAssignments(roundId: string, girlUid: string) {
  const ref = doc(db, 'matchingRounds', roundId, 'assignments', girlUid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as any) : { maleCandidates: [] }
}

// Fallback: for legacy use, set male candidates for a girl (subcollection)
export async function setAssignments(roundId: string, girlUid: string, maleCandidates: string[]) {
  const ref = doc(db, 'matchingRounds', roundId, 'assignments', girlUid)
  await setDoc(ref, { girlUid, maleCandidates, updatedAt: serverTimestamp() }, { merge: true })
}