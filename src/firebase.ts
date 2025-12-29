import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signOut as fbSignOut,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  PhoneAuthProvider,
  updateProfile,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayRemove,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  databaseURL: 'https://linkup-dc86a-default-rtdb.firebaseio.com/',
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// export const functions = getFunctions(app, 'asia-south2')
export default app;

export const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  const cred = await signInWithPopup(auth, provider)
  const info = getAdditionalUserInfo(cred)
  return { user: cred.user, isNewUser: info?.isNewUser === true }
}

export async function signOut() {
  await fbSignOut(auth)
}

import { getDatabase, ref as dbRef, onDisconnect, set, serverTimestamp as rtdbTimestamp, onValue } from 'firebase/database';

export const messaging = getMessaging(app);
export const rtdb = getDatabase(app);

// Presence Helper
export const setupPresence = (uid: string) => {
  const userStatusDatabaseRef = dbRef(rtdb, '/status/' + uid);
  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: rtdbTimestamp(),
  };
  const isOnlineForDatabase = {
    state: 'online',
    last_changed: rtdbTimestamp(),
  };

  const connectedRef = dbRef(rtdb, '.info/connected');
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() == false) {
      return;
    }
    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
      set(userStatusDatabaseRef, isOnlineForDatabase);
    });
  });
};

import { getToken } from "firebase/messaging";

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: '...' }); // Pass VAPID key if available, or let it infer from config
    if (currentToken) {
      console.log('current token for client: ', currentToken);
      // Save this token to the user document if authenticated
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

// Export auth functions for use in other components
export {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  PhoneAuthProvider,
  updateProfile
}

export type CollegeIdFiles = {
  frontUrl?: string;
  backUrl?: string;
  verified?: boolean;
  rejected?: boolean;
}

export type UserProfile = {
  uid: string
  email?: string | null
  name?: string
  gender?: 'male' | 'female'
  userType?: 'college' | 'general'
  loveLanguage?: 'words' | 'quality_time' | 'acts' | 'touch' | 'gifts'
  acceptedTermsVersion?: number
  acceptedTermsAt?: any
  setupStatus?: {
    terms?: boolean
    gender?: boolean
    profile?: boolean
    interests?: boolean
    preferences?: boolean
    q1?: boolean
    q2?: boolean
    bio?: boolean
    photos?: boolean
    completedAt?: any
  }
  isProfileComplete?: boolean
  isAdmin?: boolean
  createdAt?: any
  updatedAt?: any
  lastLoginAt?: any
  phoneNumber?: string
  isPhoneVerified?: boolean
  // Preferences
  ageRangeMin?: number
  ageRangeMax?: number
  distancePreference?: number // in km
  globalMode?: boolean
  pushNotifications?: boolean
  emailUpdates?: boolean
  readReceipts?: boolean

  // Referral / Matching
  referralCode?: string
  referredBy?: string
  hasMatched?: boolean
  referralEarningsPaid?: number
  upiId?: string

  [k: string]: any
}

// ---- Account Deletion Request ----
export async function requestAccountDeletion(uid: string, reason: string) {
  const refReq = doc(db, 'account_delete_requests', uid)
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  const userData = userSnap.exists() ? userSnap.data() : {}

  await setDoc(refReq, {
    uid,
    email: userData.email || null,
    phoneNumber: userData.phoneNumber || null,
    reason,
    requestedAt: serverTimestamp(),
    status: 'pending'
  })
}

export function normalizeProfile(raw: any | null): UserProfile | null {
  if (!raw) return raw
  const status: Record<string, any> =
    raw.setupStatus && typeof raw.setupStatus === 'object' ? { ...raw.setupStatus } : {}
  Object.keys(raw).forEach(k => {
    if (k.startsWith('setupStatus.') && k !== 'setupStatus') {
      const sub = k.split('.').slice(1).join('.')
      if (sub) status[sub] = raw[k]
    }
  })
  return { ...(raw as UserProfile), setupStatus: status }
}

export function computeIsProfileComplete(p?: UserProfile | null): boolean {
  if (!p) return false
  const s = p.setupStatus || {}

  // Common checks
  const basic = !!(
    p.acceptedTermsAt &&
    p.acceptedTermsVersion &&
    p.gender &&
    p.name &&
    p.dob &&
    s.profile &&
    p.interests?.length &&
    p.communicationImportance &&
    p.conflictApproach &&
    p.sundayStyle &&
    p.travelPreference &&
    p.loveLanguage &&
    p.bio &&
    p.photoUrl &&
    s.photos &&
    (p.ageRangeMin !== undefined) &&
    (p.distancePreference !== undefined)
  )

  if (!basic) return false

  // College specific checks
  if (!p.userType || p.userType === 'college') {
    return !!(p.college)
  }

  // General user checks (no college required)
  return true
}

export function nextSetupRoute(p?: UserProfile | null): string | null {
  if (!p || !p.isProfileComplete) return '/setup/profile'
  return null
}

export async function ensureUserDocument(user: FirebaseUser) {
  if (!user || !user.uid) {
    throw new Error('User must be authenticated before ensuring user document.')
  }
  const refDoc = doc(db, 'users', user.uid)
  const snap = await getDoc(refDoc)
  const now = serverTimestamp()
  if (!snap.exists()) {
    await setDoc(refDoc, {
      uid: user.uid,
      email: user.email ?? null,
      name: user.displayName || '',
      photoUrl: user.photoURL || null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isProfileComplete: false,
      setupStatus: {},
    })
  } else {
    await updateDoc(refDoc, { lastLoginAt: now, updatedAt: now })
  }
  const after = await getDoc(refDoc)
  return normalizeProfile(after.data())
}

export async function mergeSetupStatus(uid: string, statusPatch: Record<string, any>) {
  const refDoc = doc(db, 'users', uid)
  const snap = await getDoc(refDoc)
  const existing = snap.exists() ? normalizeProfile(snap.data()) : null
  const mergedStatus = {
    ...(existing?.setupStatus || {}),
    ...statusPatch,
  }
  await setDoc(refDoc, {
    setupStatus: mergedStatus,
    updatedAt: serverTimestamp(),
  }, { merge: true })
  return mergedStatus
}

export async function updateProfileAndStatus(
  uid: string,
  fieldPatch: Record<string, any>,
  statusPatch?: Record<string, any>
) {
  const refDoc = doc(db, 'users', uid)
  let mergedStatus = undefined
  if (statusPatch) {
    const snap = await getDoc(refDoc)
    const existing = snap.exists() ? normalizeProfile(snap.data()) : null
    mergedStatus = { ...(existing?.setupStatus || {}), ...statusPatch }
    await setDoc(refDoc, {
      ...fieldPatch,
      setupStatus: mergedStatus,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } else {
    await setDoc(refDoc, {
      ...fieldPatch,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }
  const fresh = await getDoc(refDoc)
  const prof = normalizeProfile(fresh.data())
  const complete = computeIsProfileComplete(prof)
  if (complete && !prof?.isProfileComplete) {
    await updateDoc(refDoc, {
      isProfileComplete: true,
      'setupStatus.completedAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  return prof
}

export async function uploadProfilePhoto(uid: string, file: File, index?: number) {
  const fileName = typeof index === 'number' ? `profile_${index}.jpg` : 'profile.jpg'
  const r = ref(storage, `users/${uid}/profile_images/${fileName}`)
  const task = uploadBytesResumable(r, file, { contentType: file.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve())
  })
  return await getDownloadURL(r)
}

export async function uploadChatAudio(chatId: string, file: Blob) {
  const fileName = `audio_${Date.now()}.webm`
  const r = ref(storage, `chat-audio/${chatId}/${fileName}`)
  const task = uploadBytesResumable(r, file, { contentType: 'audio/webm' })
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve())
  })
  return await getDownloadURL(r)
}

/* ---- Upload college ID ---- */
export async function uploadCollegeId(uid: string, frontFile: File, backFile: File) {
  // Upload front
  const frontRef = ref(storage, `users/${uid}/college-id/front.jpg`)
  const frontTask = uploadBytesResumable(frontRef, frontFile, { contentType: frontFile.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    frontTask.on('state_changed', undefined, reject, () => resolve())
  })
  const frontUrl = await getDownloadURL(frontRef)

  // Upload back
  const backRef = ref(storage, `users/${uid}/college-id/back.jpg`)
  const backTask = uploadBytesResumable(backRef, backFile, { contentType: backFile.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    backTask.on('state_changed', undefined, reject, () => resolve())
  })
  const backUrl = await getDownloadURL(backRef)

  // Store URLs in Firestore
  const refDoc = doc(db, 'users', uid)
  await setDoc(refDoc, {
    collegeId: {
      frontUrl,
      backUrl,
      verified: false // Set true after admin verification
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
  return { frontUrl, backUrl }
}

export async function finalizeIfComplete(uid: string) {
  const refDoc = doc(db, 'users', uid)
  const snap = await getDoc(refDoc)
  if (!snap.exists()) return
  const prof = normalizeProfile(snap.data())
  if (!prof?.isProfileComplete && computeIsProfileComplete(prof)) {
    await updateDoc(refDoc, {
      isProfileComplete: true,
      'setupStatus.completedAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function saveUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateProfileAndStatus(uid, data)
}

/* ---- College ID admin verification ---- */
export async function verifyCollegeId(uid: string) {
  // Only call from admin context
  const refDoc = doc(db, 'users', uid)
  await setDoc(refDoc, {
    collegeId: {
      verified: true
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/* Callables (unchanged skeleton) */
const FUNCTIONS_REGION = 'asia-south2'
export const functions = getFunctions(app, FUNCTIONS_REGION)

export async function callJoinMatchingRound(payload: { roundId: string; planId?: string }) {
  const fn = httpsCallable(functions, 'joinMatchingRound'); return fn(payload)
}
export async function callConfirmMatch(payload: { roundId: string; girlUid: string }) {
  const fn = httpsCallable(functions, 'confirmMatch'); return fn(payload)
}
export async function callAdminPromoteMatch(payload: { roundId: string; boyUid: string; girlUid: string }) {
  const fn = httpsCallable(functions, 'adminPromoteMatch'); return fn(payload)
}
export async function callAdminApprovePayment(payload: { paymentId: string }) {
  const fn = httpsCallable(functions, 'adminApprovePayment'); return fn(payload)
}
export async function callConfirmMatchByGirl(payload: { roundId: string; boyUid: string }) {
  const fn = httpsCallable(functions, 'confirmMatchByGirl');
  return fn(payload);
}

export { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayRemove }
export { FUNCTIONS_REGION }