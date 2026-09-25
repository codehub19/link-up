import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../state/AuthContext'
import { RandomCallDoc, declineCall, subscribeIncomingCalls } from '../services/randomCall'
import '../pages/dashboard/RandomCall.styles.css'

// Ignore rings older than this (e.g. the caller closed the app without hanging up)
const RING_MAX_AGE_MS = 60_000

/** Shows a full-screen "X is calling" prompt anywhere in the app when a match calls you. */
export default function IncomingCall() {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [call, setCall] = useState<RandomCallDoc | null>(null)
  const [caller, setCaller] = useState<{ name?: string; photoUrl?: string } | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeIncomingCalls(user.uid, (calls) => {
      const fresh = calls
        .filter((c) => c.type === 'match')
        .filter((c: any) => {
          const ms = c.createdAt?.toMillis?.() ?? Date.now()
          return Date.now() - ms < RING_MAX_AGE_MS
        })
      setCall(fresh[0] || null)
    })
  }, [user])

  useEffect(() => {
    if (!call) { setCaller(null); return }
    getDoc(doc(db, 'users', call.callerUid))
      .then((s) => setCaller(s.exists() ? (s.data() as any) : null))
      .catch(() => setCaller(null))
  }, [call?.id])

  // Already on the call page answering this call
  if (!call || !user || loc.search.includes(call.id)) return null

  const name = caller?.name?.split(' ')[0] || 'Your match'
  return (
    <div className="rc-incoming" role="dialog" aria-label={`${name} is calling`}>
      <div className="rc-card">
        <div className="rc-pulse">
          {caller?.photoUrl
            ? <img className="rc-avatar" src={caller.photoUrl} alt={name} />
            : <span>📞</span>}
        </div>
        <h2>{name} is calling…</h2>
        <div className="rc-choice">
          <button className="rc-btn rc-btn-ghost" onClick={() => declineCall(call.id, user.uid).catch(() => { })}>
            Decline
          </button>
          <button className="rc-btn rc-btn-primary" onClick={() => nav(`/dashboard/random-call?call=${call.id}`)}>
            Answer
          </button>
        </div>
      </div>
    </div>
  )
}
