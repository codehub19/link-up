import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

// Configure from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // e.g., linkup-dc86a.firebasestorage.app
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Explicit bucket binding
export const storage = getStorage(app, `gs://${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}`)

// Cloud Functions
export const functions = getFunctions(app)

// Emulators
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

// Auth helpers
export const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const res = await signInWithPopup(auth, provider)
  return res.user
}

export async function signOut() {
  await fbSignOut(auth)
}

// Ensure users/{uid} exists and lightly update on login.
// Supports both ensureUserDocument(user) and ensureUserDocument(uid, email?, name?, photoURL?)
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

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      email: em,
      name: nm,
      photoUrl: photo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(userRef, {
      email: em,
      name: nm,
      photoUrl: photo,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  return await getDoc(userRef)
}

// Profile image upload (resumable + contentType)
export async function uploadProfilePhoto(uid: string, file: File) {
  const r = ref(storage, `users/${uid}/profile.jpg`)
  const task = uploadBytesResumable(r, file, { contentType: file.type || 'image/jpeg' })
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve())
  })
  return await getDownloadURL(r)
}

// TYPE: shape of your user profile document
export type UserProfile = {
  uid: string
  name?: string
  gender?: 'male' | 'female'
  instagramId?: string
  college?: string
  bio?: string
  interests?: string[]
  photoUrl?: string
  // flags
  isAdmin?: boolean
  isProfileComplete?: boolean
  createdAt?: any
  updatedAt?: any
  lastLoginAt?: any
}

// Save or update profile (used by Profile.tsx)
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(userRef, {
      ...cleaned,
      updatedAt: serverTimestamp(),
    } as any)
  }
}

// Callable wrappers
export async function callJoinMatchingRound(payload: { roundId: string; planId?: string }) {
  const join = httpsCallable(functions, 'joinMatchingRound')
  return await join(payload)
}

export async function callConfirmMatch(payload: { roundId: string; girlUid: string }) {
  const fn = httpsCallable(functions, 'confirmMatch')
  return await fn(payload)
}


// Re-export common Firestore helpers
export { doc, getDoc, setDoc, updateDoc, serverTimestamp }