import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, callConfirmMatch } from '../../../firebase'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import MaleTabs from '../../../components/MaleTabs'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { getMaleEntitlement } from '../../../services/entitlements'

type Like = {
  id: string
  roundId: string
  likingUserUid: string
  likedUserUid: string
}

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
}

type Match = {
  id: string
  participants: string[]
  boyUid: string
  girlUid: string
  status: 'confirmed'
}

export default function MaleMatches() {
  const { user } = useAuth()
  const [likes, setLikes] = useState<Like[]>([])
  const [girls, setGirls] = useState<Record<string, UserDoc>>({})
  const [matches, setMatches] = useState<Match[]>([])
  const [remaining, setRemaining] = useState<number>(0)

  const confirmedGirlIds = useMemo(
    () => new Set(matches.map((m) => m.girlUid)),
    [matches]
  )

  useEffect(() => {
    if (!user) return
    const run = async () => {
      // Entitlement banner
      const ent = await getMaleEntitlement(user.uid)
      setRemaining(ent.remainingMatches ?? 0)

      // Likes sent to me (by girls)
      const likesQ = query(collection(db, 'likes'), where('likedUserUid', '==', user.uid))
      const likeSnaps = await getDocs(likesQ)
      const ls: Like[] = likeSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

      // Fetch girls' profiles
      const girlsNeeded = Array.from(new Set(ls.map((l) => l.likingUserUid)))
      const usersSnaps = await Promise.all(
        girlsNeeded.map(async (uid) => {
          const r = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
          return r.docs[0]
        })
      )
      const gmap: Record<string, UserDoc> = {}
      for (const d of usersSnaps) {
        if (d) {
          const data = d.data() as UserDoc
          gmap[data.uid] = data
        }
      }

      // Confirmed matches
      const matchSnaps = await getDocs(
        query(collection(db, 'matches'), where('participants', 'array-contains', user.uid))
      )
      const ms: Match[] = matchSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

      setLikes(ls)
      setGirls(gmap)
      setMatches(ms)
    }
    run()
  }, [user])

  const confirm = async (like: Like) => {
    try {
      const res: any = await callConfirmMatch({ roundId: like.roundId, girlUid: like.likingUserUid })
      toast.success('Connection revealed to both of you!')
      // refresh matches + remaining
      const matchSnaps = await getDocs(
        query(collection(db, 'matches'), where('participants', 'array-contains', user!.uid))
      )
      const ms: Match[] = matchSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setMatches(ms)
      const ent = await getMaleEntitlement(user!.uid)
      setRemaining(ent.remainingMatches ?? 0)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to confirm match')
    }
  }

  const pendingLikes = likes.filter((l) => !confirmedGirlIds.has(l.likingUserUid))

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />

        <div className={`banner ${remaining === 0 ? 'ghost' : ''}`} style={{ marginBottom: 12 }}>
          Remaining matches: <b>{remaining}</b>
        </div>

        <h2>My Matches</h2>

        <h3 style={{ marginTop: 12 }}>Pending Likes</h3>
        {pendingLikes.length === 0 ? (
          <div className="empty">No matches yet. When a girl likes your profile from a matching round, she will appear here.</div>
        ) : (
          <Carousel>
            {pendingLikes.map((l) => {
              const g = girls[l.likingUserUid]
              return (
                <ProfileMiniCard
                  key={l.id}
                  photoUrl={g?.photoUrl}
                  name={g?.name}
                  instagramId={g?.instagramId}
                  bio={g?.bio}
                  interests={g?.interests}
                  footer={
                    <button className="btn primary" onClick={() => confirm(l)} disabled={remaining <= 0}>
                      {remaining <= 0 ? 'Quota used' : 'Select & Reveal'}
                    </button>
                  }
                />
              )
            })}
          </Carousel>
        )}

        <h3 style={{ marginTop: 24 }}>Confirmed</h3>
        {matches.length === 0 ? (
          <div className="empty">No confirmed connections yet.</div>
        ) : (
          <Carousel>
            {matches.map((m) => {
              const g = girls[m.girlUid]
              if (!g) return null
              return (
                <ProfileMiniCard
                  key={m.id}
                  photoUrl={g.photoUrl}
                  name={g.name}
                  instagramId={g.instagramId}
                  bio={g.bio}
                  interests={g.interests}
                />
              )
            })}
          </Carousel>
        )}
      </div>
    </>
  )
}