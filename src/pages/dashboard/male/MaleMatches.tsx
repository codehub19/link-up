import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db, callConfirmMatch } from '../../../firebase'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import MaleTabs from '../../../components/MaleTabs'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { getMaleEntitlement } from '../../../services/entitlements'
import { Link, useNavigate } from 'react-router-dom'

type Like = {
  id: string
  roundId: string
  likingUserUid: string // girl
  likedUserUid: string  // me (boy)
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
  dob?: string // ISO (YYYY-MM-DD)
  collegeId?: { verified?: boolean }
}

type Match = {
  id: string
  participants: string[]
  boyUid: string
  girlUid: string
  status: 'confirmed'
}

function ageFromDob(dob?: string): number | undefined {
  if (!dob) return
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 ? age : undefined
}

const CARD_WIDTH = 370
const CARD_GAP = 18

export default function MaleMatches() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [likes, setLikes] = useState<Like[]>([])
  const [girls, setGirls] = useState<Record<string, UserDoc>>({})
  const [matches, setMatches] = useState<Match[]>([])
  const [remaining, setRemaining] = useState<number>(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())

  // Set of girl uids already confirmed with me
  const confirmedGirlIds = useMemo(
    () => new Set(matches.map((m) => m.girlUid)),
    [matches]
  )

  useEffect(() => {
    if (!user) return
    const run = async () => {
      try {
        // Entitlement (remaining matches)
        const ent = await getMaleEntitlement(user.uid)
        setRemaining(ent.remainingMatches ?? 0)

        // Likes (girls who liked me)
        const likesQ = query(collection(db, 'likes'), where('likedUserUid', '==', user.uid))
        const likeSnaps = await getDocs(likesQ)
        const ls: Like[] = likeSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

        // Unique girl uids from likes
        const girlUids = Array.from(new Set(ls.map((l) => l.likingUserUid)))

        // Fetch those girls' profiles directly by id
        const userSnaps = await Promise.all(girlUids.map((uid) => getDoc(doc(db, 'users', uid))))
        const gmap: Record<string, UserDoc> = {}
        for (const s of userSnaps) {
          if (s.exists()) gmap[s.id] = s.data() as UserDoc
        }

        // Confirmed matches (with me)
        const matchQ = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid))
        const matchSnaps = await getDocs(matchQ)
        const ms: Match[] = matchSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

        setLikes(ls)
        setGirls(gmap)
        setMatches(ms)
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to load matches')
      }
    }
    run()
  }, [user])

  const refreshMatchesAndQuota = async () => {
    if (!user) return
    const matchQ = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid))
    const matchSnaps = await getDocs(matchQ)
    const ms: Match[] = matchSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    setMatches(ms)
    const ent = await getMaleEntitlement(user.uid)
    setRemaining(ent.remainingMatches ?? 0)
  }

  const confirm = async (like: Like) => {
    try {
      await callConfirmMatch({ roundId: like.roundId, girlUid: like.likingUserUid })
      toast.success('Connection revealed to both of you!')
      await refreshMatchesAndQuota()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to confirm match')
    }
  }

  // Like button logic for demo purposes (local only)
  const like = (uid: string) => {
    setLiked((prev) => new Set(prev).add(uid))
  }

  // Pending: unique by girl uid, excluding already confirmed girls
  const pendingUnique: Like[] = useMemo(() => {
    const raw = likes.filter((l) => !confirmedGirlIds.has(l.likingUserUid))
    const seen = new Set<string>()
    const out: Like[] = []
    for (const l of raw) {
      if (!seen.has(l.likingUserUid)) {
        seen.add(l.likingUserUid)
        out.push(l)
      }
    }
    return out
  }, [likes, confirmedGirlIds])

  // Confirmed: unique by girl uid (safety)
  const confirmedUnique: Match[] = useMemo(() => {
    const seen = new Set<string>()
    const out: Match[] = []
    for (const m of matches) {
      if (!seen.has(m.girlUid)) {
        seen.add(m.girlUid)
        out.push(m)
      }
    }
    return out
  }, [matches])

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />

        <div
          className={`banner ${remaining === 0 ? 'ghost' : ''}`}
          style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          Remaining matches: <b>{remaining}</b>
          {remaining === 0 ? (
            <button className="btn btn-primary" onClick={() => nav('/dashboard/plans')}>Buy again</button>
          ) : null}
        </div>

        <h2>My Matches</h2>

        <h3 style={{ marginTop: 12 }}>Pending Likes</h3>
        {pendingUnique.length === 0 ? (
          <div className="empty">No matches yet. When a girl likes your profile from a matching round, she will appear here.</div>
        ) : (
          <Carousel itemWidth={CARD_WIDTH} gap={CARD_GAP} widthPercent={80} ariaLabel="Pending likes">
            {pendingUnique.map((l) => {
              const g = girls[l.likingUserUid]
              if (!g) return null
              return (
                <ProfileMiniCard
                  key={g.uid}
                  user={g}
                  footer={
                    <button
                      className={`btn ${liked.has(g.uid) ? 'ghost' : 'primary'}`}
                      onClick={() => like(g.uid)}
                      disabled={liked.has(g.uid)}
                    >
                      {liked.has(g.uid) ? 'Liked' : 'Like'}
                    </button>
                  }
                />
              )
            })}
          </Carousel>
        )}

        <h3 style={{ marginTop: 24 }}>Confirmed</h3>
        {confirmedUnique.length === 0 ? (
          <div className="empty">No confirmed connections yet.</div>
        ) : (
          <Carousel itemWidth={CARD_WIDTH} gap={CARD_GAP} widthPercent={80} ariaLabel="Confirmed matches">
            {confirmedUnique.map((m) => {
              const g = girls[m.girlUid]
              if (!g) return null
              return (
                <ProfileMiniCard
                  key={g.uid}
                  user={g}
                  footer={
                    <div className="row" style={{ marginTop: 12 }}>
                      <Link className="btn primary" to={`/dashboard/chat?with=${encodeURIComponent(m.girlUid)}`}>
                        Chat
                      </Link>
                    </div>
                  }
                />
              )
            })}
          </Carousel>
        )}
      </div>
    </>
  )
}