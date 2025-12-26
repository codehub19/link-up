import React, { useState } from 'react'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // 1. Sign in with Firebase SDK
      const auth = getAuth()
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const u = cred.user

      // 2. Check admin status in Firestore
      const snap = await getDoc(doc(db, 'users', u.uid))
      const isAdmin = snap.exists() && (snap.data() as any)?.isAdmin === true

      if (!isAdmin) {
        await signOut(auth)
        throw new Error('Not an admin account')
      }

      // 3. Wait for AuthContext to pick up the change
      // We loop briefly until 'auth.currentUser' matches our 'u.uid' 
      // AND importantly, we might want to ensure the global 'user' object is ready if we accessed it from context.
      // But since Protected uses useAuth(), we just need to ensure the context updates involved in useAuth happen. 
      // A simple small delay is usually enough, but let's be robust.
      // Actually, since we are inside the component, we can't easily peek into the Context's future state 
      // without using the valid context value. 
      // Instead, we simply wait a moment. The context update is triggered by onAuthStateChanged which is async.

      let attempts = 0
      while (attempts < 20) {
        if (auth.currentUser?.uid === u.uid) {
          break;
        }
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }

      // 4. Navigate
      // We use replace to prevent going back to login
      nav('/admin/home', { replace: true })
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Login failed')
      // If we signed in but failed checks, ensure sign out
      const auth = getAuth()
      if (auth.currentUser) await signOut(auth)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error ? <div style={{ color: '#ef4444' }}>{error}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}