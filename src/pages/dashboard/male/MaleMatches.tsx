import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, callConfirmMatch } from '../../../firebase'
import { useEffect, useMemo, useState } from 'react'
import ProfileCard from '../../../components/ProfileCard'
import { toast } from 'sonner'

type Like = {
  id: string
  roundId: string
  likingUserUid: string // girl
  likedUserUid: string  // boy (me)
}

type UserDoc = {
  uid: string
  name: string
  instagramId: string
  photoUrl?: string
  bio?: string
  interests?: string[]
  gender: 'male' | 'female'
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

  const confirmedGirlIds = useMemo(
    () => new Set(matches.map((m) => m.girlUid)),
    [matches]
  )

  useEffect(() => {
    if (!user) return
    const run = async () => {
      const likesQ = query(collection(db, 'likes'), where('likedUserUid', '==', user.uid))
      const likeSnaps = await getDocs(likesQ)
      const ls: Like[] = likeSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

      const girlsNeeded = Array.from(new Set(ls.map((l) => l.likingUserUid)))
      const usersSnaps = await Promise.all(
        girlsNeeded.map(async (uid) => {
          const docSnap = await getDocs(
            query(collection(db, 'users'), where('uid', '==', uid))
          )
          return docSnap.docs[0]
        })
      )
      const gmap: Record<string, UserDoc> = {}
      for (const d of usersSnaps) {
        if (d) {
          const data = d.data() as UserDoc
          gmap[data.uid] = data
        }
      }

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
      await callConfirmMatch({ roundId: like.roundId, girlUid: like.likingUserUid })
      toast.success('Connection revealed to both of you!')
      // refresh
      const matchSnaps = await getDocs(
        query(collection(db, 'matches'), where('participants', 'array-contains', user!.uid))
      )
      const ms: Match[] = matchSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setMatches(ms)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to confirm match')
    }
  }

  const pendingLikes = likes.filter((l) => !confirmedGirlIds.has(l.likingUserUid))

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>My Matches</h2>

        {pendingLikes.length === 0 ? (
          <div className="empty">No matches yet. When a girl likes your profile from a matching round, she will appear here.</div>
        ) : (
          <div className="grid cols-3">
            {pendingLikes.map((l) => {
              const g = girls[l.likingUserUid]
              return (
                <ProfileCard
                  key={l.id}
                  data={{ photoUrl: g?.photoUrl, bio: g?.bio, interests: g?.interests }}
                  footer={
                    <button className="btn primary" onClick={() => confirm(l)}>
                      Select & Reveal
                    </button>
                  }
                />
              )
            })}
          </div>
        )}

        <h3 style={{ marginTop: 32 }}>Confirmed</h3>
        <div className="grid cols-3">
          {matches.map((m) => {
            const g = girls[m.girlUid]
            if (!g) return null
            return (
              <div className="card" key={m.id}>
                <div className="card-body">
                  <div className="card-media">
                    {g.photoUrl ? <img src={g.photoUrl} /> : <div className="media-placeholder" />}
                  </div>
                  <div className="row">
                    <strong>{g.name}</strong>
                    <span>@{g.instagramId}</span>
                  </div>
                  <p className="bio">{g.bio}</p>
                  <div className="tags">
                    {(g.interests ?? []).map((i) => <span key={i} className="tag">{i}</span>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}