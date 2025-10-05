import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc,setDoc } from 'firebase/firestore'
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
      // implicit repair handled by normalizeProfile; we can optionally write back
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await ensureUserDocument(u)
        await loadProfile(u.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    login: async () => {
      const { user: u, isNewUser } = await signInWithGoogle()
      await ensureUserDocument(u)
      await loadProfile(u.uid)
      return isNewUser
    },
    logout: async () => { await signOut() },
    refreshProfile: async () => { if (auth.currentUser) await loadProfile(auth.currentUser.uid) },
  }), [user, profile, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)