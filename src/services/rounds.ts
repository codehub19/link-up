import {
  collection, getDocs, query, where, doc, setDoc, serverTimestamp, writeBatch,
  getDoc, updateDoc, Timestamp, addDoc
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase'

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

  // 4. Sync Males
  const syncRes = await syncApprovedMalesToActiveRound()

  // 5. Smart Match Boys (Phase 1)
  const matchRes = await smartAutoMatchBoys(roundId)

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

    const functions = getFunctions(undefined, "asia-south2")
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

export async function autoMatchUsers(roundId: string, phase: 'boys' | 'girls', countPerUser: number = 3) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  if (!roundSnap.exists()) throw new Error('Round not found')

  const roundData = roundSnap.data() as any
  const assignedMap = phase === 'boys'
    ? (roundData.assignedGirlsToBoys || {})
    : (roundData.assignedBoysToGirls || {})

  let sources: string[] = [] // Users who need assignments
  let targets: string[] = [] // Pool of candidates

  if (phase === 'boys') {
    // Phase Boys: Assign Girls (targets) to Boys (sources)
    sources = roundData.participatingMales || []

    // Fetch all girls (optimize: maybe cache or pass in?)
    // For now, fetch all female users
    const q = query(collection(db, 'users'), where('gender', '==', 'female'))
    const snap = await getDocs(q)
    targets = snap.docs.map(d => d.id)

  } else {
    // Phase Girls: Assign Boys (targets) to Girls (sources)
    // Who are the girls? We don't have explicit 'participatingFemales' usually.
    // Use all girls who liked someone? Or just all girls?
    // Request says "random allocation... girls to boys". 
    // Let's assume we want to assign candidates to ALL known girls.
    const q = query(collection(db, 'users'), where('gender', '==', 'female'))
    const snap = await getDocs(q)
    sources = snap.docs.map(d => d.id)

    // Targets are the participating boys usually
    targets = roundData.participatingMales || []
  }

  // Shuffle Targets
  const shuffle = (array: string[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }

  // Perform Assignment
  let changes = 0
  const newAssignments = { ...assignedMap }

  for (const sourceUid of sources) {
    // Skip if already has assignments (optional, but safer to not overwrite manual work)
    if (newAssignments[sourceUid] && newAssignments[sourceUid].length > 0) continue;

    // Pick N random targets
    // We shuffle a COPY of targets every time to ensure randomness per user
    // (Inefficient for huge lists, but fine for <1000 users)
    const shuffledTargets = shuffle([...targets])
    const selected = shuffledTargets.slice(0, countPerUser)

    newAssignments[sourceUid] = selected
    changes++
  }

  if (changes > 0) {
    const updateField = phase === 'boys' ? 'assignedGirlsToBoys' : 'assignedBoysToGirls'
    await updateDoc(roundRef, {
      [updateField]: newAssignments,
      updatedAt: serverTimestamp()
    })
  }

  return { assignedUsersCount: changes }
}

// --- SMART MATCHING ---

// Helper: Calculate Age
function getAge(dob?: string): number {
  if (!dob) return 21; // Default age if missing
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper: Calculate Score
function calculateMatchScore(source: any, candidate: any): number {
  let score = 0;

  // --- 1. HARD FILTERS (Dealbreakers) ---

  // A. Age Range Check
  const srcAge = getAge(source.dob);
  const candAge = getAge(candidate.dob);
  const minAge = source.ageRangeMin || 18;
  const maxAge = source.ageRangeMax || 35;

  if (candAge < minAge || candAge > maxAge) {
    return -10000; // Hard Exclude: Outside Age Preference
  }

  // B. Dating Preference / User Type
  // If Source wants "College Only" and Candidate is NOT college -> Reject
  if (source.datingPreference === 'college_only' && candidate.userType !== 'college') {
    return -10000;
  }
  // If Candidate wants "College Only" and Source is NOT college -> Reject
  if (candidate.datingPreference === 'college_only' && source.userType !== 'college') {
    return -10000;
  }

  // --- 2. BASE COMPATIBILITY ---

  // User Type Match (College + College = Vibe)
  if (source.userType === 'college' && candidate.userType === 'college') {
    score += 20;
  }

  // College Match (Same College = Huge Bonus)
  if (source.college && candidate.college && source.college === candidate.college) {
    score += 50;
  }

  // --- 3. INTERESTS & PERSONALITY ---

  // Interests Overlap
  const srcInterests = (source.interests || []) as string[];
  const candInterests = (candidate.interests || []) as string[];
  const intersection = srcInterests.filter(i => candInterests.includes(i));
  score += (intersection.length * 5); // +5 per interest

  // Detailed Personality Compatibility (Vibe Check)
  // Love Language (Same = Good)
  if (source.loveLanguage && candidate.loveLanguage && source.loveLanguage === candidate.loveLanguage) {
    score += 15;
  }
  // Sunday Style (Same = Good)
  if (source.sundayStyle && candidate.sundayStyle && source.sundayStyle === candidate.sundayStyle) {
    score += 10;
  }
  // Travel Preference (Same = Good)
  if (source.travelPreference && candidate.travelPreference && source.travelPreference === candidate.travelPreference) {
    score += 10;
  }

  // --- 4. RANDOM NOISE ---
  // A little chaos to prevent identical rankings every time
  score += Math.random() * 5;

  return score;
}

export async function smartAutoMatchBoys(roundId: string, countPerUser: number = 3) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  if (!roundSnap.exists()) throw new Error('Round not found')
  const roundData = roundSnap.data() as any

  // Sources: Participating Males
  const maleUids: string[] = roundData.participatingMales || []

  // Targets: All Females
  const qGirls = query(collection(db, 'users'), where('gender', '==', 'female'))
  const snapGirls = await getDocs(qGirls)
  // Pre-filter: Must be valid profiles
  const allGirls = snapGirls.docs
    .map(d => ({ uid: d.id, ...d.data() } as any))
    .filter(g => g.isProfileComplete === true) // Only complete profiles

  const assignedMap = roundData.assignedGirlsToBoys || {}
  let changes = 0

  for (const boyUid of maleUids) {
    if (assignedMap[boyUid] && assignedMap[boyUid].length > 0) continue; // Skip if already assigned

    const boySnap = await getDoc(doc(db, 'users', boyUid))
    if (!boySnap.exists()) continue
    const boyProfile = boySnap.data()

    // 1. Fetch Past Matches (History Check)
    // We want to avoid re-matching with the same person
    const historyQ = query(
      collection(db, 'matches'),
      where('participants', 'array-contains', boyUid)
    )
    const historySnap = await getDocs(historyQ)
    const pastMatchUids = new Set<string>()
    historySnap.forEach(h => {
      const data = h.data()
      // If participants = [boy, girl], add girl to set
      if (data.girlUid) pastMatchUids.add(data.girlUid)
      // Generic fallback
      const other = data.participants.find((p: string) => p !== boyUid)
      if (other) pastMatchUids.add(other)
    })

    // 2. Score Candidates
    const scored = allGirls.map(g => {
      // Exclude if previously matched
      if (pastMatchUids.has(g.uid)) return { uid: g.uid, score: -99999 }

      return {
        uid: g.uid,
        score: calculateMatchScore(boyProfile, g)
      }
    }).filter(x => x.score > -500) // Filter hard excludes (Dealbreakers)

    // 3. Sort Descending
    scored.sort((a, b) => b.score - a.score)

    // 4. Pick Top N
    const selected = scored.slice(0, countPerUser).map(x => x.uid)

    if (selected.length > 0) {
      assignedMap[boyUid] = selected
      changes++
    }
  }

  if (changes > 0) {
    await updateDoc(roundRef, {
      assignedGirlsToBoys: assignedMap,
      updatedAt: serverTimestamp()
    })
  }
  return { changes }
}

export async function smartAutoMatchGirls(roundId: string, countPerUser: number = 3) {
  const roundRef = doc(db, 'matchingRounds', roundId)
  const roundSnap = await getDoc(roundRef)
  if (!roundSnap.exists()) throw new Error('Round not found')
  const roundData = roundSnap.data() as any

  // 1. Get Likes for this round
  const likesQ = query(collection(db, 'likes'), where('roundId', '==', roundId))
  const likesSnap = await getDocs(likesQ)

  // Group likes by girl
  const girlsLikesMap: Record<string, string[]> = {} // girlUid -> [boyUid, boyUid]
  likesSnap.docs.forEach(d => {
    const data = d.data()
    const girlUid = data.to
    const boyUid = data.from
    if (!girlsLikesMap[girlUid]) girlsLikesMap[girlUid] = []
    if (!girlsLikesMap[girlUid].includes(boyUid)) girlsLikesMap[girlUid].push(boyUid)
  })

  const assignedMap = roundData.assignedBoysToGirls || {}
  let changes = 0

  // Iterate over girls who received likes
  for (const girlUid of Object.keys(girlsLikesMap)) {
    if (assignedMap[girlUid] && assignedMap[girlUid].length > 0) continue; // Skip

    const candidates = girlsLikesMap[girlUid]
    const girlSnap = await getDoc(doc(db, 'users', girlUid))
    if (!girlSnap.exists()) continue;
    const girlProfile = girlSnap.data()

    // Fetch and Score Candidates
    const scoredBoys = []
    for (const bUid of candidates) {
      const bSnap = await getDoc(doc(db, 'users', bUid))
      if (bSnap.exists()) {
        const score = calculateMatchScore(girlProfile, bSnap.data())
        // Keep even if score is low? No, if it's a Dealbreaker (score < -100), we should probably block it
        // even if he liked her. (e.g. He lied about age, or she changed preferences)
        if (score > -500) {
          scoredBoys.push({ uid: bUid, score })
        }
      }
    }

    // Sort
    scoredBoys.sort((a, b) => b.score - a.score)
    const selected = scoredBoys.slice(0, countPerUser).map(x => x.uid)

    // Only assign if valid candidates exist
    if (selected.length > 0) {
      assignedMap[girlUid] = selected
      changes++
    }
  }

  if (changes > 0) {
    await updateDoc(roundRef, {
      assignedBoysToGirls: assignedMap,
      updatedAt: serverTimestamp()
    })
  }
  return { changes }
}
