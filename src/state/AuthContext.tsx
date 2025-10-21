import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  db,
  ensureUserDocument,
  signInWithGoogle,
  signOut,
  UserProfile,
  computeIsProfileComplete,
  finalizeIfComplete,
  normalizeProfile,
} from '../firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '../firebase'

type AuthCtx = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  login: () => Promise<boolean>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) {
      setProfile(null)
      return
    }
    let data = normalizeProfile(snap.data())
    // Auto repair: if flattened keys exist and nested is empty
    if (data && Object.keys(data.setupStatus || {}).length === 0) {
      const statusCopy = data.setupStatus || {}
      await setDoc(doc(db, 'users', uid), { setupStatus: statusCopy }, { merge: true })
    }
    if (data && !data.isProfileComplete && computeIsProfileComplete(data)) {
      await finalizeIfComplete(uid)
      const again = await getDoc(doc(db, 'users', uid))
      data = normalizeProfile(again.data())
    }
    setProfile(data)
  }

  // Save FCM token to Firestore for the user
  const saveFcmToken = async (u: User) => {
    try {
      // Only try if Notification API is available and permission is granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const token = await getToken(messaging, { vapidKey: "BJMro5dKsOYThOeAFmzgqyZ5a5wUzlFQjEMNGChI6KxSqQHPCw_6_NcPNuLt0O-gR04SR-QeCCUhezAIQjC3s_U" })
        if (token) {
          await setDoc(doc(db, "users", u.uid), { fcmToken: token }, { merge: true })
        }
      }
    } catch (e) {
      // Optionally handle errors or prompt the user
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u && u.uid) {
        await ensureUserDocument(u)
        await loadProfile(u.uid)
        await saveFcmToken(u)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
    // eslint-disable-next-line
  }, [])

  // Listen for foreground FCM messages, but DO NOT show browser notification (avoid duplicates!)
  useEffect(() => {
    if (!messaging) return
    const unsub = onMessage(messaging, (payload) => {
      // Only update app UI here (toast, badge, etc). DO NOT call new Notification or showNotification.
      // Example: showToast(payload.notification?.title || 'New Notification')
    });
    return () => { unsub() }
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    login: async () => {
      const { user: u, isNewUser } = await signInWithGoogle()
      if (u && u.uid) {
        await ensureUserDocument(u)
        await loadProfile(u.uid)
        await saveFcmToken(u)
      }
      return isNewUser
    },
    logout: async () => { await signOut() },
    refreshProfile: async () => { if (auth.currentUser) await loadProfile(auth.currentUser.uid) },
  }), [user, profile, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)