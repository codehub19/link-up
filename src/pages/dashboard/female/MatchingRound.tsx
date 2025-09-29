import Navbar from '../../../components/Navbar'
import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import ProfileCard from '../../../components/ProfileCard'
import { useAuth } from '../../../state/AuthContext'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

type Round = {
  roundId: string
  isActive: boolean
  participatingMales: string[]
}

type UserDoc = {
  uid: string
  photoUrl?: string
  bio?: string
  interests?: string[]
}

export default function MatchingRound() {
  const { user } = useAuth()
  const [round, setRound] = useState<Round | null>(null)
  const [males, setMales] = useState<UserDoc[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchRound = async () => {
      const rq = query(collection(db, 'matchingRounds'), where('isActive', '==', true), limit(1))
      const snaps = await getDocs(rq)
      if (snaps.empty) {
        setRound(null)
        return
      }
      setRound(snaps.docs[0].data() as Round)
    }
    fetchRound()
  }, [])

  useEffect(() => {
    const fetchMales = async () => {
      if (!round?.participatingMales?.length) return setMales([])
      const ids = round.participatingMales.slice(0, 5) // show 5
      const users: UserDoc[] = []
      for (const uid of ids) {
        const s = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
        if (!s.empty) users.push(s.docs[0].data() as UserDoc)
      }
      setMales(users)
    }
    fetchMales()
  }, [round])

  const like = async (boyUid: string) => {
    if (!user || !round) return
    try {
      const newId = `${round.roundId}_${user.uid}_${boyUid}`
      await setDoc(doc(db, 'likes', newId), {
        roundId: round.roundId,
        likingUserUid: user.uid,
        likedUserUid: boyUid,
        timestamp: new Date(),
      })
      setLiked(new Set([...liked, boyUid]))
      toast.success('Liked!')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to like')
    }
  }

  if (!round) {
    return (
      <>
        <Navbar />
        <div className="container">
          <h2>The next round is coming soon!</h2>
          <p className="muted">We'll notify you when it's live.</p>
          <Link className="btn" to="/dashboard/connections">My Connections</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="banner">The new round is live! Check out today's profiles.</div>
        <div className="grid cols-3">
          {males.map((m) => (
            <ProfileCard
              key={m.uid}
              data={{ photoUrl: m.photoUrl, bio: m.bio, interests: m.interests }}
              footer={
                <button className={`btn ${liked.has(m.uid) ? 'ghost' : 'primary'}`} onClick={() => like(m.uid)}>
                  {liked.has(m.uid) ? 'Liked' : 'Like'}
                </button>
              }
            />
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <Link className="btn ghost" to="/dashboard/connections">My Connections</Link>
        </div>
      </div>
    </>
  )
}