import Navbar from '../../../components/Navbar'
import FemaleTabs from '../../../components/FemaleTabs'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { getActiveRound } from '../../../services/rounds'
import { getBoysWhoLikedGirl } from '../../../services/likes'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, callConfirmMatchByGirl } from '../../../firebase'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
  college?: string
}

// Helper to get live status of a round
function getRoundLiveStatus(phases: any): { live: boolean, phase: string | null } {
  const now = Date.now();
  if (phases?.boys?.startAt && phases?.boys?.endAt) {
    const boysStart = phases.boys.startAt.seconds * 1000;
    const boysEnd = phases.boys.endAt.seconds * 1000;
    if (now >= boysStart && now <= boysEnd) return { live: true, phase: 'boys' };
  }
  if (phases?.girls?.startAt && phases?.girls?.endAt) {
    const girlsStart = phases.girls.startAt.seconds * 1000;
    const girlsEnd = phases.girls.endAt.seconds * 1000;
    if (now >= girlsStart && now <= girlsEnd) return { live: true, phase: 'girls' };
  }
  return { live: false, phase: null };
}

export default function MatchingRound() {
  const { user } = useAuth()
  const [roundId, setRoundId] = useState<string | null>(null)
  const [roundObj, setRoundObj] = useState<any | null>(null)
  const [boyUids, setBoyUids] = useState<string[]>([])
  const [boys, setBoys] = useState<UserDoc[]>([])
  const [confirmedBoyUids, setConfirmedBoyUids] = useState<Set<string>>(new Set())

  useEffect(() => {
    const run = async () => {
      const active = await getActiveRound()
      if (!active) {
        setRoundId(null)
        setRoundObj(null)
        return
      }
      setRoundId(active.id || active.roundId)
      setRoundObj(active)
    }
    run()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!roundId || !user) {
        setBoyUids([])
        return
      }
      const uids = await getBoysWhoLikedGirl(roundId, user.uid)
      setBoyUids(uids || [])
    }
    run()
  }, [roundId, user])

  useEffect(() => {
    const run = async () => {
      if (boyUids.length === 0) {
        setBoys([])
        return
      }
      const users: UserDoc[] = []
      for (const uid of boyUids) {
        const s = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
        if (!s.empty) users.push(s.docs[0].data() as UserDoc)
      }
      setBoys(users)
    }
    run()
  }, [boyUids])

  // Load already confirmed matches for this girl
  useEffect(() => {
    const loadConfirmed = async () => {
      if (!user || !roundId) return
      const q = query(
        collection(db, 'matches'),
        where('roundId', '==', roundId),
        where('girlUid', '==', user.uid)
      )
      const snap = await getDocs(q)
      const set = new Set<string>(snap.docs.map(d => d.data().boyUid))
      setConfirmedBoyUids(set)
    }
    loadConfirmed()
  }, [user, roundId])

  // Use the new function for girls to confirm a match!
  const confirm = async (boyUid: string) => {
    if (!user || !roundId) return
    if (confirmedBoyUids.has(boyUid)) return
    try {
      await callConfirmMatchByGirl({ roundId, boyUid })
      const next = new Set(confirmedBoyUids)
      next.add(boyUid)
      setConfirmedBoyUids(next)
      toast.success('Connection revealed to both of you!')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to confirm match')
    }
  }

  // Get live status for the round
  const roundStatus = roundObj ? getRoundLiveStatus(roundObj.phases) : { live: false, phase: null }

  if (roundId === null) {
    return (
      <>
        <Navbar />
        <div className="container">
          <FemaleTabs />
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
        <FemaleTabs />
        {/* Show round live badge if round is live */}
        {roundStatus.live && (
          <div className="badge badge-live" style={{ marginBottom: 12 }}>
            {roundStatus.phase === 'boys'
              ? "Boys' Round is LIVE now!"
              : "Girls' Round is LIVE now!"}
          </div>
        )}
        <div className="banner">Boys who liked you this round. Select and reveal to match!</div>

        {boyUids.length === 0 ? (
          <div className="empty">No boys have liked your profile yet this round.</div>
        ) : boys.length === 0 ? (
          <div className="empty">Loading profiles…</div>
        ) : (
          <Carousel>
            {boys.map((b) => (
              <ProfileMiniCard
                key={b.uid}
                photoUrl={b.photoUrl}
                name={confirmedBoyUids.has(b.uid) ? b.name : "Hidden until matched"}
                instagramId={confirmedBoyUids.has(b.uid) ? b.instagramId : undefined}
                bio={b.bio}
                interests={b.interests}
                footer={
                  <button
                    className={`btn ${confirmedBoyUids.has(b.uid) ? 'ghost' : 'primary'}`}
                    onClick={() => confirm(b.uid)}
                    disabled={confirmedBoyUids.has(b.uid)}
                  >
                    {confirmedBoyUids.has(b.uid) ? 'Matched' : 'Select & Reveal'}
                  </button>
                }
              />
            ))}
          </Carousel>
        )}
      </div>
    </>
  )
}