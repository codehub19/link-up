import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// export const app = initializeApp(firebaseConfig)
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

export type UserProfile = {
  uid: string
  email?: string | null
  name?: string
  gender?: 'male' | 'female'
  instagramId?: string
  college?: string
  dob?: string
  interests?: string[]
  bio?: string
  photoUrl?: string
  communicationImportance?: 'extremely' | 'very' | 'moderate' | 'low'
  conflictApproach?: 'address_immediately' | 'cool_down' | 'wait_other' | 'avoid'
  sundayStyle?: 'relax_brunch' | 'active_fitness' | 'personal_project' | 'social_family'
  travelPreference?: 'relaxing_resort' | 'explore_city' | 'active_adventure' | 'visit_family'
  loveLanguage?: 'words' | 'quality_time' | 'acts' | 'touch' | 'gifts'
  acceptedTermsVersion?: number
  acceptedTermsAt?: any
  setupStatus?: {
    terms?: boolean
    gender?: boolean
    profile?: boolean
    interests?: boolean
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
  // Allow unknown flattened keys for migration
  [k: string]: any
}

/* ---- Normalization ---- */
export function normalizeProfile(raw: any | null): UserProfile | null {
  if (!raw) return raw
  const status: Record<string, any> =
    raw.setupStatus && typeof raw.setupStatus === 'object' ? { ...raw.setupStatus } : {}
  // Collect flattened keys like 'setupStatus.gender'
  Object.keys(raw).forEach(k => {
    if (k.startsWith('setupStatus.') && k !== 'setupStatus') {
      const sub = k.split('.').slice(1).join('.')
      if (sub) status[sub] = raw[k]
    }
  })
  return { ...(raw as UserProfile), setupStatus: status }
}

/* ---- Completion logic ---- */
export function computeIsProfileComplete(p?: UserProfile | null): boolean {
  if (!p) return false
  const s = p.setupStatus || {}
  return !!(
    p.acceptedTermsAt &&
    p.acceptedTermsVersion &&
    p.gender &&
    p.name &&
    p.college &&
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
    s.photos
  )
}

/* Unified wizard always goes here if incomplete */
export function nextSetupRoute(p?: UserProfile | null): string | null {
  if (!p || !p.isProfileComplete) return '/setup/profile'
  return null
}

/* ---- User bootstrap ---- */
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

/* ---- Safe status merge helper (replaces dotted path writes) ---- */
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

/* Generic field + status merge */
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
  // Recompute completion
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

/* ---- Upload photo ---- */
export async function uploadProfilePhoto(uid: string, file: File) {
  const r = ref(storage, `users/${uid}/profile.jpg`)
  const task = uploadBytesResumable(r, file, { contentType: file.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve())
  })
  return await getDownloadURL(r)
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

/* Backwards compatibility wrapper */
export async function saveUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateProfileAndStatus(uid, data)
}

/* Callables (unchanged skeleton) */
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

export { doc, getDoc, setDoc, updateDoc, serverTimestamp }


const FUNCTIONS_REGION = 'asia-south2'  

export const functions = getFunctions(app, FUNCTIONS_REGION)

export { FUNCTIONS_REGION }