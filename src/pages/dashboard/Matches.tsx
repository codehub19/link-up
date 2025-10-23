import Navbar from '../../components/Navbar'
import { useAuth } from '../../state/AuthContext'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import ProfileMiniCard from '../../components/ProfileMiniCard'
import { Link } from 'react-router-dom'
import MaleTabs from '../../components/MaleTabs'
import FemaleTabs from '../../components/FemaleTabs'
import ProfileMatchCard from '../../components/ProfileMatchCard'

type Match = {
  id: string
  roundId: string
  participants: string[]
  girlUid?: string
  boyUid?: string
  createdAt?: any
}

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  photoUrls?: string[]
  bio?: string
  interests?: string[]
  college?: string
  gender?: string
}

export default function MatchesPage() {
  const { user, profile } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})

  useEffect(() => {
    if (!user) return
    const run = async () => {
      // Get all matches where current user is a participant
      const ms = await getDocs(query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)))
      const mds: Match[] = ms.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setMatches(mds)

      // Find all unique UIDs of the other party in each match
      const ids = Array.from(new Set(
        mds.map((m) => m.participants.find((uid: string) => uid !== user.uid))
      )).filter(Boolean) as string[]

      // Fetch all user profiles in one go
      const snaps = await Promise.all(
        ids.map(async (uid) => {
          const r = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
          return r.docs[0]
        })
      )
      const map: Record<string, UserDoc> = {}
      for (let i = 0; i < ids.length; i++) {
        const snap = snaps[i]
        if (snap && snap.exists()) {
          map[ids[i]] = { uid: ids[i], ...(snap.data() as any) }
        }
      }
      setUsers(map)
    }
    run()
  }, [user])

  return (
    <>
      <Navbar />
      <div className="container">
        {profile?.gender === 'male' ? <MaleTabs/> : <FemaleTabs />}
        <h2 style={{marginTop:24}}>My Connections</h2>
        <div className="banner" style={{marginBottom:16}}>
          These are your matches from all rounds. Click a profile to view details or start a chat.
        </div>
        {matches.length === 0 ? (
          <div className="empty">No matches yet.</div>
        ) : (
          <div className="grid cols-2" style={{gap:20}}>
            {(() => {
  // Build a map: otherUid -> Match (pick the latest match if multiple)
  const uniqueMatches: Record<string, Match> = {}
  matches.forEach(m => {
    const otherUid = m.participants.find((uid: string) => uid !== user?.uid)
    if (!otherUid) return
    // If already seen, keep the one with latest createdAt (if available)
    if (!uniqueMatches[otherUid] || (
      m.createdAt && uniqueMatches[otherUid].createdAt && m.createdAt.seconds > uniqueMatches[otherUid].createdAt.seconds
    )) {
      uniqueMatches[otherUid] = m
    }
  })
  // Only one card per matched user!
  return Object.entries(uniqueMatches).map(([otherUid, m]) => {
    const u = users[otherUid]
    return u ? (
      <ProfileMatchCard
        key={u.uid}
        user={u}
        footer={
          <Link className="btn" to={`/dashboard/chat?with=${encodeURIComponent(u.uid)}`}>Chat</Link>
        }
      />
    ) : null
  })
})()}
          </div>
        )}
      </div>
    </>
  )
}