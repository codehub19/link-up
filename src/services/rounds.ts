import {
  collection, getDocs, query, where, doc, setDoc, serverTimestamp, writeBatch,
  getDoc, updateDoc, Timestamp, addDoc
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import { isSubscriptionActive } from './subscriptions'

/** Premium doesn't guarantee matches; it gives priority. Premium men get this many times more suggestions. */
const PREMIUM_SUGGESTION_MULTIPLIER = 2

/** Everyone with active (time-based) Premium right now. */
export async function getPremiumUids(): Promise<Set<string>> {
  const snap = await getDocs(query(collection(db, 'subscriptions'), where('status', '==', 'active')))
  return new Set(snap.docs.filter((d) => isSubscriptionActive(d.data())).map((d) => String(d.data().uid)))
}

/** Stable sort: Premium users first, original order otherwise. */
function premiumFirst<T>(items: T[], uidOf: (x: T) => string, premium: Set<string>): T[] {
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => Number(premium.has(uidOf(b.x))) - Number(premium.has(uidOf(a.x))) || a.i - b.i)
    .map((o) => o.x)
}

export async function createAndSetupRound() {
  // 1. Create Round
  const roundId = `Round-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`
  await createRound(roundId)

  // 2. Set Active
  await setActiveRound(roundId)

  // 3. Set Phase Times (Default: Now to 24h later for BOTH)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const startAt = Timestamp.fromDate(now)
  const endAt = Timestamp.fromDate(tomorrow)

  const roundRef = doc(db, 'matchingRounds', roundId)
  await updateDoc(roundRef, {
    'phases.boys': { startAt, endAt, isComplete: false },
    'phases.girls': { startAt, endAt, isComplete: false }
  })

  // 4. Sync Males (server)
  const syncRes = await syncActiveRound()

  // 5. Smart Match Boys (Phase 1, server)
  const matchRes = await runRoundMatching(roundId, 'boys', 'smart')

  // 6. Send Notification
  sendRoundNotification().catch(e => console.error("Notification failed", e))

  return { roundId, males: syncRes.totalMales, matches: matchRes.changes }
}

async function sendRoundNotification() {
  try {
    const snap = await getDocs(collection(db, "users"))
    const userUids = snap.docs.map(doc => doc.id)
    const title = "New Round Started! 🚀"
    const body = "A new matching round has just begun. Check your potential matches now!"

    await addDoc(collection(db, "notifications"), {
      title, body, userUid: null, createdAt: serverTimestamp(), targetType: 'all', roundId: null
    })

    const sendPush = httpsCallable(functions, "sendPushNotification")
    await sendPush({ userUids, title, body })
  } catch (e) {
    console.error("Failed to send auto-notification", e)
  }
}



export async function setPhaseTimes(roundId: string, phase: 'boys' | 'girls', times: { startAt: any, endAt: any, isComplete?: boolean }) {
  await updateDoc(doc(db, 'matchingRounds', roundId), {
    [`phases.${phase}`]: times
  })
}

export async function getPhaseTimes(roundId: string) {
  const snap = await getDoc(doc(db, 'matchingRounds', roundId))
  const data = snap.exists() ? snap.data() : {}
  return data?.phases ?? { boys: {}, girls: {} }
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

/** Join the active round (the server checks eligibility). */
export async function addMaleToActiveRound(_uid?: string) {
  await httpsCallable(functions, 'joinMatchingRound')({})
  return { changed: true }
}

/* ---- Server-side round actions ---- */

export type MyRound = { round: { id: string; phases: any; phase: string | null } | null; inRound?: boolean; assigned?: string[] }

/** The active round as this member sees it (their own suggestions only). */
export async function getMyRound(): Promise<MyRound> {
  const res = await httpsCallable(functions, 'getMyRound')({})
  return res.data as MyRound
}

/** Admin: run matching on the server. */
export async function runRoundMatching(roundId: string, phase: 'boys' | 'girls', mode: 'smart' | 'random' = 'smart', countPerUser = 3) {
  const res = await httpsCallable(functions, 'runRoundMatching')({ roundId, phase, mode, countPerUser })
  return res.data as { changes: number }
}

/** Admin: add Premium men to the active round and drop ineligible people (server). */
export async function syncActiveRound() {
  const res = await httpsCallable(functions, 'syncActiveRound')({})
  return res.data as { activeRoundId: string; totalMales: number; premiumMales: number }
}
