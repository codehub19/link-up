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
import HomeBackground from '../../components/home/HomeBackground'
import './dashboard.css'
import './Matches.styles.css'

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
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        {profile?.gender === 'male' ? <MaleTabs /> : <FemaleTabs />}

        <div className="matches-hero">
          <h1 className="matches-title text-gradient">My Connections</h1>
          <p className="matches-subtitle">Your matches from all rounds.</p>
        </div>

        <div className="matches-info-banner">
          Click a profile to view details or start a chat with your matches.
        </div>

        {matches.length === 0 ? (
          <div className="matches-empty-card">
            <div className="matches-empty-title">No Matches Yet</div>
            <p className="matches-empty-text">Join the next matching round to find verified connections!</p>
            <Link className="matches-action-btn" to="/dashboard/rounds">View Rounds</Link>
          </div>
        ) : (
          <div className="matches-grid">
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
                      <Link className="match-card-action-btn" to={`/dashboard/chat?with=${encodeURIComponent(u.uid)}`}>
                        Start Chat
                      </Link>
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