import React, { useState } from 'react'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin(){
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
      const auth = getAuth()
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const u = cred.user
      const snap = await getDoc(doc(db, 'users', u.uid))
      const isAdmin = snap.exists() && (snap.data() as any)?.isAdmin === true
      if (!isAdmin) {
        await signOut(auth)
        throw new Error('Not an admin account')
      }
      nav('/admin/home')
    } catch (e: any) {
      setError(e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth: 480, margin:'40px auto', padding:24}}>
        <h2 style={{marginTop:0}}>Admin Login</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {error ? <div style={{color:'#ef4444'}}>{error}</div> : null}
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}