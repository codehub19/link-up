// Minimal, stable firebase init with region export

const FUNCTIONS_REGION = 'asia-south2'  // <— Central region constant

import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

// Configure from .env (public client config)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app, `gs://${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}`)

// IMPORTANT: region now consistent with deployed functions
export const functions = getFunctions(app, FUNCTIONS_REGION)

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

// Auth helpers
export const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  const cred = await signInWithPopup(auth, provider)
  const info = getAdditionalUserInfo(cred)
  return { user: cred.user, isNewUser: info?.isNewUser === true }
}

export async function signOut() {
  await fbSignOut(auth)
}

// Ensure user doc
export async function ensureUserDocument(
  userOrUid:
    | FirebaseUser
    | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }
    | string,
  email?: string | null,
  displayName?: string | null,
  photoURL?: string | null
) {
  let uid: string | undefined
  let em: string | null = null
  let nm: string | null = null
  let photo: string | null = null

  if (typeof userOrUid === 'string') {
    uid = userOrUid
    em = email ?? null
    nm = displayName ?? null
    photo = photoURL ?? null
  } else {
    const u = userOrUid as any
    uid = u?.uid
    em = u?.email ?? null
    nm = u?.displayName ?? null
    photo = u?.photoURL ?? null
  }

  if (!uid) throw new Error('ensureUserDocument: uid missing')

  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const now = serverTimestamp()

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      email: em,
      name: nm || null,
      photoUrl: photo || null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    })
  } else {
    const existing = snap.data() as any
    const existingName = (existing?.name ?? '').trim()
    const existingPhoto = (existing?.photoUrl ?? '').trim()
    const updates: Record<string, any> = {
      email: em,
      lastLoginAt: now,
      updatedAt: now,
    }
    if (!existingName && nm) updates.name = nm
    if (!existingPhoto && photo) updates.photoUrl = photo
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates)
    }
  }

  return await getDoc(userRef)
}

// Profile photo upload
export async function uploadProfilePhoto(uid: string, file: File) {
  const r = ref(storage, `users/${uid}/profile.jpg`)
  const task = uploadBytesResumable(r, file, { contentType: file.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve())
  })
  return getDownloadURL(r)
}

// User profile type & save
export type UserProfile = {
  uid: string
  name?: string
  gender?: 'male' | 'female'
  instagramId?: string
  college?: string
  bio?: string
  interests?: string[]
  photoUrl?: string
  dob?: string
  isAdmin?: boolean
  isProfileComplete?: boolean
  createdAt?: any
  updatedAt?: any
  lastLoginAt?: any
}

export async function saveUserProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const cleaned: Partial<UserProfile> = { ...data }
  if (typeof cleaned.instagramId === 'string') {
    cleaned.instagramId = cleaned.instagramId.replace(/^@/, '').trim()
  }
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      ...cleaned,
      isProfileComplete: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(userRef, {
      ...cleaned,
      isProfileComplete: true,
      updatedAt: serverTimestamp(),
    } as any)
  }
}

// Callables (unchanged)
export async function callJoinMatchingRound(payload: { roundId: string; planId?: string }) {
  const fn = httpsCallable(functions, 'joinMatchingRound')
  return fn(payload)
}

export async function callConfirmMatch(payload: { roundId: string; girlUid: string }) {
  const fn = httpsCallable(functions, 'confirmMatch')
  return fn(payload)
}

export async function callAdminPromoteMatch(payload: { roundId: string; boyUid: string; girlUid: string }) {
  const fn = httpsCallable(functions, 'adminPromoteMatch')
  return fn(payload)
}

export async function callAdminApprovePayment(payload: { paymentId: string }) {
  const fn = httpsCallable(functions, 'adminApprovePayment')
  return fn(payload)
}

// Re-export Firestore helpers
export { doc, getDoc, setDoc, updateDoc, serverTimestamp }

// Export region constant for other modules
export { FUNCTIONS_REGION }