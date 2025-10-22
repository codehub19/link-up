import {
  collection, getDocs, query, where, doc, setDoc, serverTimestamp, writeBatch,
  getDoc,updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'



export async function setPhaseTimes(roundId: string, phase: 'boys'|'girls', times: {startAt: any, endAt: any, isComplete?: boolean}) {
  await updateDoc(doc(db, 'matchingRounds', roundId), {
    [`phases.${phase}`]: times
  })
}

export async function getPhaseTimes(roundId: string) {
  const snap = await getDoc(doc(db, 'matchingRounds', roundId))
  const data = snap.exists() ? snap.data() : {}
  return data?.phases ?? {boys:{},girls:{}}
}

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
  await setDoc(doc(db, "matchingRounds", roundId), {
    id: roundId,
    isActive: true,
    participatingMales: [],
    participatingFemales: [],
    phases: {
      boys: {
        startAt: null,
        endAt: null,
        isComplete: false,
      },
      girls: {
        startAt: null,
        endAt: null,
        isComplete: false,
      },
    },
  });
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

// --- PHASE MANAGEMENT ---
export async function setRoundPhase(roundId: string, phase: 'boys' | 'girls') {
  await setDoc(doc(db, 'matchingRounds', roundId), { phase, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getRoundPhase(roundId: string): Promise<'boys' | 'girls'> {
  const snap = await getDoc(doc(db, 'matchingRounds', roundId))
  return (snap.data()?.phase || 'boys')
}

// --- ASSIGNMENT MANAGEMENT ---

export async function assignGirlsToBoy(roundId: string, boyUid: string, girlUids: string[]) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  const data = roundSnap.data() || {}
  const assigned = data.assignedGirlsToBoys || {}
  assigned[boyUid] = girlUids
  await setDoc(roundRef, { assignedGirlsToBoys: assigned, updatedAt: serverTimestamp() }, { merge: true })
}

export async function assignBoysToGirl(roundId: string, girlUid: string, boyUids: string[]) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  const data = roundSnap.data() || {}
  const assigned = data.assignedBoysToGirls || {}
  assigned[girlUid] = boyUids
  await setDoc(roundRef, { assignedBoysToGirls: assigned, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getAssignedGirlsForBoy(roundId: string, boyUid: string): Promise<string[]> {
  const roundSnap = await getDoc(doc(db, 'matchingRounds', roundId))
  const data = roundSnap.data() || {}
  return data.assignedGirlsToBoys?.[boyUid] || []
}

export async function getAssignedBoysForGirl(roundId: string, girlUid: string): Promise<string[]> {
  const roundSnap = await getDoc(doc(db, 'matchingRounds', roundId))
  const data = roundSnap.data() || {}
  return data.assignedBoysToGirls?.[girlUid] || []
}

// --- EXISTING ADMIN UTILITIES ---


// ... other imports and functions ...

export async function syncApprovedMalesToActiveRound() {
  const active = await getActiveRound()
  if (!active) throw new Error('No active round')

  // Get all active subscriptions
  const subSnap = await getDocs(query(
    collection(db, 'subscriptions'),
    where('status', '==', 'active'),
  ))

  const validUids: string[] = []
  for (const docSnap of subSnap.docs) {
    const sub = docSnap.data()
    const remainingMatches = Number(sub.remainingMatches ?? 0)
    const roundsUsed = Number(sub.roundsUsed ?? 0)
    const roundsAllowed = Number(sub.roundsAllowed ?? 1)
    if (remainingMatches > 0 && roundsUsed < roundsAllowed) {
      validUids.push(sub.uid)
    }
  }

  // Filter: only male users with profile complete
  const maleUids: string[] = []
  for (const uid of validUids) {
    const us = await getDoc(doc(db, 'users', uid))
    if (!us.exists()) continue
    const u = us.data() as any
    if (u.gender === 'male' && u.isProfileComplete === true) maleUids.push(uid)
  }

  // Always update the round so only CURRENT active/valid males are present
  const roundRef = doc(db, 'matchingRounds', active.id)
  await setDoc(roundRef, {
    participatingMales: maleUids,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  return {
    activeRoundId: active.id,
    totalMales: maleUids.length,
  }
}

export async function addMaleToActiveRound(uid: string) {
  const active = await getActiveRound()
  if (!active) throw new Error('No active round')
  const roundRef = doc(db, 'matchingRounds', active.id)
  const roundSnap = await getDoc(roundRef)
  const existing: string[] = (roundSnap.data() as any)?.participatingMales || []
  if (existing.includes(uid)) return { changed: false }
  const merged = [...existing, uid]
  await setDoc(roundRef, { participatingMales: merged, updatedAt: serverTimestamp() }, { merge: true })
  return { changed: true }
}