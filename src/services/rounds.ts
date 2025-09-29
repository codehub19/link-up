import {
  collection, getDocs, query, where, doc, setDoc, serverTimestamp, writeBatch,
  getDoc,
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

/**
 * Admin utility:
 * - Finds the active round
 * - Collects all approved payments
 * - Filters to male users with complete profiles
 * - Unions them into participatingMales
 */
export async function syncApprovedMalesToActiveRound() {
  const active = await getActiveRound()
  if (!active) throw new Error('No active round')

  // Get all approved payments
  const paySnap = await getDocs(query(
    collection(db, 'payments'),
    where('status', '==', 'approved')
  ))
  const uids = Array.from(new Set(paySnap.docs.map(d => (d.data() as any).uid as string)))

  // Filter: only male users with profile complete
  const maleUids: string[] = []
  for (const uid of uids) {
    const us = await getDoc(doc(db, 'users', uid))
    if (!us.exists()) continue
    const u = us.data() as any
    if (u.gender === 'male' && u.isProfileComplete === true) maleUids.push(uid)
  }

  // Merge with existing participatingMales
  const roundRef = doc(db, 'matchingRounds', active.id)
  const roundSnap = await getDoc(roundRef)
  const existing: string[] = (roundSnap.data() as any)?.participatingMales || []
  const merged = Array.from(new Set([...existing, ...maleUids]))

  await setDoc(roundRef, {
    participatingMales: merged,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  return {
    activeRoundId: active.id,
    addedCount: merged.length - existing.length,
    totalMales: merged.length,
  }
}

/**
 * Quick helper to add a single male uid to the active round.
 */
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