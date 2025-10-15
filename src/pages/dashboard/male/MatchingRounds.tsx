import Navbar from '../../../components/Navbar'
import MaleTabs from '../../../components/MaleTabs'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { getActiveRound } from '../../../services/rounds'
import { getAssignedGirlsForBoy } from '../../../services/assignments'
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { toast } from 'sonner'

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
  college?: string
  dob?: string
}

type SubscriptionDoc = {
  status: string // 'active', 'expired', etc.
  planId?: string
  validUntil?: any // timestamp
}

export default function MatchingRounds() {
  const { user } = useAuth()
  const [roundId, setRoundId] = useState<string | null>(null)
  const [assignedUids, setAssignedUids] = useState<string[]>([])
  const [girls, setGirls] = useState<UserDoc[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [subscription, setSubscription] = useState<SubscriptionDoc | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [hasAnySubscription, setHasAnySubscription] = useState<boolean>(false)

  useEffect(() => {
    const run = async () => {
      const active = await getActiveRound()
      if (!active) {
        setRoundId(null)
        return
      }
      setRoundId(active.id || active.roundId)
    }
    run()
  }, [])

  // Fetch subscription/plan status for the user
  useEffect(() => {
    const fetchSub = async () => {
      setLoadingSub(true)
      if (!user) {
        setSubscription(null)
        setHasAnySubscription(false)
        setLoadingSub(false)
        return
      }
      const subSnap = await getDocs(
  query(collection(db, 'subscriptions'), where('uid', '==', user.uid))
)
      if (subSnap.empty) {
        setSubscription(null)
        setHasAnySubscription(false)
      } else {
        setHasAnySubscription(true)
        const subs = subSnap.docs.map(d => d.data() as SubscriptionDoc)
        // Sort by validUntil if needed, pick the most recent one
        const activeSub = subs.find(s => s.status === 'active')
        setSubscription(activeSub || subs[0] || null)
      }
      setLoadingSub(false)
    }
    fetchSub()
  }, [user])

  useEffect(() => {
    const run = async () => {
      if (!roundId || !user) {
        setAssignedUids([])
        return
      }
      const assigned = await getAssignedGirlsForBoy(roundId, user.uid)
      setAssignedUids(assigned || [])
    }
    run()
  }, [roundId, user])

  useEffect(() => {
    const run = async () => {
      if (assignedUids.length === 0) {
        setGirls([])
        return
      }
      const users: UserDoc[] = []
      for (const uid of assignedUids) {
        const s = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
        if (!s.empty) users.push(s.docs[0].data() as UserDoc)
      }
      setGirls(users)
    }
    run()
  }, [assignedUids])

  // Load liked girls for this user/round
  useEffect(() => {
    const loadLiked = async () => {
      if (!user || !roundId) return
      const q = query(
        collection(db, 'likes'),
        where('roundId', '==', roundId),
        where('likingUserUid', '==', user.uid)
      )
      const snap = await getDocs(q)
      const set = new Set<string>(snap.docs.map(d => d.data().likedUserUid))
      setLiked(set)
    }
    loadLiked()
  }, [user, roundId])

  const like = async (girlUid: string) => {
    if (!user || !roundId) return
    if (liked.has(girlUid)) return
    try {
      const newId = `${roundId}_${user.uid}_${girlUid}`
      await setDoc(doc(db, 'likes', newId), {
        roundId,
        likingUserUid: user.uid,
        likedUserUid: girlUid,
        timestamp: new Date(),
      })
      const next = new Set(liked)
      next.add(girlUid)
      setLiked(next)
      toast.success('Liked!')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to like')
    }
  }

  // UI logic
  const hasActivePlan = !!subscription && subscription.status === 'active'

  return (
    <>
      <Navbar />
      <div className="container">
        <MaleTabs />
        {!loadingSub && (
          !hasAnySubscription ? (
            <div className="empty" style={{ marginTop: 32 }}>
              <div>Purchase your first plan to get exclusive discounts!</div>
              <div style={{ margin: '16px 0' }}>
                <a className="btn primary" href="/dashboard/plans">
                  Purchase Plan
                </a>
              </div>
            </div>
          ) : !hasActivePlan ? (
            <div className="empty" style={{ marginTop: 32 }}>
              <div>Your current plan has expired. Please purchase a plan to continue.</div>
              <div style={{ margin: '16px 0' }}>
                <a className="btn primary" href="/dashboard/plans">
                  Purchase/Upgrade to participate in matching rounds
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="banner">Curated girls assigned to you this round.</div>
              {assignedUids.length === 0 ? (
                <div className="empty">No profiles assigned to you yet. Please check back later.</div>
              ) : girls.length === 0 ? (
                <div className="empty">Loading assigned profiles…</div>
              ) : (
                <Carousel>
                  {girls.map((g) => (
                    <ProfileMiniCard
                      key={g.uid}
                      photoUrl={g.photoUrl}
                      name="Hidden until matched"
                      instagramId={undefined}
                      bio={g.bio}
                      interests={g.interests}
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
                  ))}
                </Carousel>
              )}
            </>
          )
        )}
      </div>
    </>
  )
}