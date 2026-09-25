import { db } from '../firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore'
import { UserProfile } from '../firebase'
import { getPlanSyncOrNull } from '../config/payments'

export interface CallSession {
  id: string
  participants: string[]
  startTime: any
  endTime?: any
  status: 'started' | 'connected' | 'ended' | 'failed'
  duration?: number // in seconds
}

export interface QueueEntry {
  uid: string
  gender: string
  lookingForGender: string | 'any'
  status: 'waiting' | 'matched'
  matchedWith?: string
  sessionId?: string
  createdAt: any
}

export async function canUserMakeCall(profile: UserProfile | null): Promise<{ allowed: boolean; reason?: string }> {
  if (!profile) return { allowed: false, reason: 'User not found' }

  const today = new Date().toISOString().split('T')[0]
  const plan = profile.planId ? getPlanSyncOrNull(profile.planId) : null

  // Free Plan Logic
  if (!plan) {
    const totalSuccessful = profile.successfulCallsCount || 0
    if (totalSuccessful >= 5) {
      return { allowed: false, reason: 'You have reached the limit of 5 successful calls for the free plan. Upgrade to premium for more calls!' }
    }
    return { allowed: true }
  }

  // Premium Plan Logic
  const dailyQuota = plan.callQuota || 0
  const userDaily = profile.dailyCalls?.date === today ? profile.dailyCalls.count : 0

  if (userDaily >= dailyQuota) {
    return { allowed: false, reason: `You have reached your daily limit of ${dailyQuota} calls. Please try again tomorrow!` }
  }

  return { allowed: true }
}

export async function logSuccessfulCall(uid: string) {
  const userRef = doc(db, 'users', uid)
  const today = new Date().toISOString().split('T')[0]
  
  const snap = await getDoc(userRef)
  if (!snap.exists()) return

  const data = snap.data()
  const dailyCalls = data.dailyCalls?.date === today 
    ? { date: today, count: (data.dailyCalls.count || 0) + 1 }
    : { date: today, count: 1 }

  await updateDoc(userRef, {
    successfulCallsCount: increment(1),
    dailyCalls: dailyCalls,
    updatedAt: serverTimestamp()
  })
}

export async function createCallSession(participants: string[]) {
  const sessionId = `rand_${participants.sort().join('_')}_${Date.now()}`
  const sessionRef = doc(db, 'call_sessions', sessionId)
  
  const sessionData: CallSession = {
    id: sessionId,
    participants,
    startTime: serverTimestamp(),
    status: 'started'
  }

  await setDoc(sessionRef, sessionData)
  return sessionId
}

export async function updateCallStatus(sessionId: string, status: 'connected' | 'ended' | 'failed', duration?: number) {
  const sessionRef = doc(db, 'call_sessions', sessionId)
  const update: any = { status, updatedAt: serverTimestamp() }
  if (duration !== undefined) update.duration = duration
  if (status === 'ended') update.endTime = serverTimestamp()
  
  await updateDoc(sessionRef, update)
}

/** 
 * Random Matching Logic 
 */
export async function findAndJoinMatch(user: { uid: string, gender: string }, lookingForGender: string | 'any'): Promise<string | null> {
  const queueRef = collection(db, 'call_queue');
  
  return await runTransaction(db, async (transaction) => {
    // 1. Search for potential matches
    let q = query(
      queueRef, 
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'asc'),
      limit(10)
    );
    
    // Filter by lookingForGender if not 'any'
    // Note: Firestore doesn't support easy dynamic queries in transactions without indexes,
    // so we'll fetch a small batch and filter in code for simplicity in this demo.
    const snapshot = await getDocs(q);
    const potentialMatch = snapshot.docs.find(d => {
      const data = d.data() as QueueEntry;
      if (data.uid === user.uid) return false;
      
      // Check if they want me
      const theyWantMe = data.lookingForGender === 'any' || data.lookingForGender === user.gender;
      // Check if I want them
      const IWantThem = lookingForGender === 'any' || lookingForGender === data.gender;
      
      return theyWantMe && IWantThem;
    });

    if (potentialMatch) {
      const matchData = potentialMatch.data() as QueueEntry;
      const sessionId = `rand_${[user.uid, matchData.uid].sort().join('_')}_${Date.now()}`;
      
      // Update match entry
      transaction.update(potentialMatch.ref, {
        status: 'matched',
        matchedWith: user.uid,
        sessionId: sessionId
      });
      
      return sessionId;
    }

    // No match found, join queue
    const myEntryRef = doc(queueRef, user.uid);
    const myEntry: QueueEntry = {
      uid: user.uid,
      gender: user.gender,
      lookingForGender,
      status: 'waiting',
      createdAt: serverTimestamp()
    };
    transaction.set(myEntryRef, myEntry);
    return null;
  });
}

export function watchMyQueueEntry(uid: string, onMatched: (sessionId: string) => void) {
  const entryRef = doc(db, 'call_queue', uid);
  return onSnapshot(entryRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as QueueEntry;
      if (data.status === 'matched' && data.sessionId) {
        onMatched(data.sessionId);
        // Clean up entry after matching
        deleteDoc(entryRef).catch(console.error);
      }
    }
  });
}

export async function leaveCallQueue(uid: string) {
  await deleteDoc(doc(db, 'call_queue', uid));
}
