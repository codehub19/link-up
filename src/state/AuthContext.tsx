import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth, db, ensureUserDocument, signInWithGoogle, signOut } from '../firebase'

export type UserProfile = {
  uid: string
  email: string
  name?: string
  gender?: 'male' | 'female'
  isAdmin?: boolean
  instagramId?: string
  college?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
  dob?: string            // NEW: ISO date string (YYYY-MM-DD)
  isProfileComplete?: boolean
  lastActivePlan?: string
}

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

  const fetchProfile = async (uid: string) => {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) setProfile(snap.data() as UserProfile)
    else setProfile(null)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await ensureUserDocument(u)
        await fetchProfile(u.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login: async () => {
        const { user: u, isNewUser } = await signInWithGoogle()
        await ensureUserDocument(u)
        await fetchProfile(u.uid)
        return isNewUser
      },
      logout: async () => {
        await signOut()
      },
      refreshProfile: async () => {
        if (auth.currentUser) await fetchProfile(auth.currentUser.uid)
      },
    }),
    [user, profile, loading]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)