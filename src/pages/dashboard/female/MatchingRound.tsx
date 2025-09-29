import Navbar from '../../../components/Navbar'
import { useEffect, useState } from 'react'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../state/AuthContext'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { listLikesByGirl } from '../../../services/likes'
import { getActiveRound } from '../../../services/rounds'
import { getAssignments } from '../../../services/assignments'

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
  college?: string
}

export default function MatchingRound() {
  const { user } = useAuth()
  const [roundId, setRoundId] = useState<string | null>(null)
  const [assignedUids, setAssignedUids] = useState<string[]>([])
  const [males, setMales] = useState<UserDoc[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())

  // Load active round id (doc id)
  useEffect(() => {
    const run = async () => {
      const active = await getActiveRound()
      if (!active) {
        setRoundId(null)
        return
      }
      // Prefer the document id for fetching assignments; keep field roundId if present for IDs
      setRoundId(active.id || active.roundId)
    }
    run()
  }, [])

  // Load this girl's assignment list for the active round
  useEffect(() => {
    const run = async () => {
      if (!roundId || !user) {
        setAssignedUids([])
        return
      }
      const a = await getAssignments(roundId, user.uid)
      setAssignedUids(a.maleCandidates || [])
    }
    run()
  }, [roundId, user])

  // Load only the assigned male profiles
  useEffect(() => {
    const run = async () => {
      if (assignedUids.length === 0) {
        setMales([])
        return
      }
      const users: UserDoc[] = []
      // Fetch sequentially to avoid "in" limit and keep it simple
      for (const uid of assignedUids) {
        const s = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
        if (!s.empty) users.push(s.docs[0].data() as UserDoc)
      }
      setMales(users)
    }
    run()
  }, [assignedUids])

  // Persisted likes: load the girl's previous likes in this round
  useEffect(() => {
    const loadLiked = async () => {
      if (!user || !roundId) return
      const ls = await listLikesByGirl(roundId, user.uid)
      const set = new Set<string>(ls.map((l: any) => l.likedUserUid))
      setLiked(set)
    }
    loadLiked()
  }, [user, roundId])

  const like = async (boyUid: string) => {
    if (!user || !roundId) return
    if (liked.has(boyUid)) return
    try {
      const newId = `${roundId}_${user.uid}_${boyUid}`
      await setDoc(doc(db, 'likes', newId), {
        roundId,
        likingUserUid: user.uid,
        likedUserUid: boyUid,
        timestamp: new Date(),
      })
      const next = new Set(liked)
      next.add(boyUid)
      setLiked(next)
      toast.success('Liked!')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to like')
    }
  }

  if (roundId === null) {
    return (
      <>
        <Navbar />
        <div className="container">
          <h2>The next round is coming soon!</h2>
          <p className="muted">We’ll notify you when it’s live.</p>
          <Link className="btn" to="/dashboard/connections">My Connections</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="banner">Today’s picks curated just for you.</div>

        {assignedUids.length === 0 ? (
          <div className="empty">No profiles assigned to you yet. Please check back later.</div>
        ) : males.length === 0 ? (
          <div className="empty">Loading assigned profiles…</div>
        ) : (
          <Carousel>
            {males.map((m) => (
              <ProfileMiniCard
                key={m.uid}
                photoUrl={m.photoUrl}
                name={m.name}
                instagramId={m.instagramId}
                bio={m.bio}
                interests={m.interests}
                footer={
                  <button
                    className={`btn ${liked.has(m.uid) ? 'ghost' : 'primary'}`}
                    onClick={() => like(m.uid)}
                    disabled={liked.has(m.uid)}
                  >
                    {liked.has(m.uid) ? 'Liked' : 'Like'}
                  </button>
                }
              />
            ))}
          </Carousel>
        )}

        <div style={{ marginTop: 24 }}>
          <Link className="btn ghost" to="/dashboard/connections">My Connections</Link>
        </div>
      </div>
    </>
  )
}