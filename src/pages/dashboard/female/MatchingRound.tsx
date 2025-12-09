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
  photoUrls?: string[]
  bio?: string
  interests?: string[]
  college?: string
  dob?: string
  collegeId?: { verified?: boolean }
  loveLanguage?: string
  travelPreference?: string
  sundayStyle?: string
  communicationImportance?: string
  conflictApproach?: string
  email?: string
  gender?: string
  verified?: boolean
  userType?: 'college' | 'general'
  datingPreference?: 'college_only' | 'open_to_all'
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
  const { user, profile } = useAuth()
  const [roundId, setRoundId] = useState<string | null>(null)
  const [roundObj, setRoundObj] = useState<any | null>(null)
  const [boyUids, setBoyUids] = useState<string[]>([])
  const [boys, setBoys] = useState<UserDoc[]>([])
  const [confirmedBoyUids, setConfirmedBoyUids] = useState<Set<string>>(new Set())
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Load assigned boys
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

      // FILTERING LOGIC:
      // If current user is a student and wants "College Only", filter out general users
      let filteredProfiles = users
      if (profile?.userType !== 'general' && profile?.datingPreference === 'college_only') {
        filteredProfiles = users.filter(p => p.userType !== 'general')
      }
      // Also filter out "College Only" students if current user is General (reverse check)
      if (profile?.userType === 'general') {
        filteredProfiles = filteredProfiles.filter(p =>
          !(p.userType !== 'general' && p.datingPreference === 'college_only')
        )
      }

      setBoys(filteredProfiles)
    }
    run()
  }, [boyUids, profile])

  // Fix: Load already confirmed matches for this girl in this round,
  // but ensure all matches for this round/girl are checked (even if girlUid is not set, fallback to participants)
  useEffect(() => {
    const loadConfirmed = async () => {
      if (!user || !roundId) return
      // Query for all matches in this round where this user is a participant
      const q = query(
        collection(db, 'matches'),
        where('roundId', '==', roundId),
        where('participants', 'array-contains', user.uid)
      )
      const snap = await getDocs(q)
      const set = new Set<string>()
      snap.docs.forEach(d => {
        const data = d.data()
        // Get boyUid if present, else extract from participants
        if (data.boyUid && typeof data.boyUid === 'string') {
          set.add(data.boyUid)
        } else if (Array.isArray(data.participants)) {
          const boy = data.participants.find((uid: string) => uid !== user.uid)
          if (boy) set.add(boy)
        }
      })
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

  const handleCarouselChange = () => {
    setExpandedIdx(null); // Always close expanded profile on carousel change
  };

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
          <Carousel onChange={handleCarouselChange}>
            {boys.map((b, idx) => (
              <ProfileMiniCard
                key={b.uid}
                user={b}
                expanded={expandedIdx === idx}
                onExpand={() => setExpandedIdx(idx)}
                onCollapse={() => setExpandedIdx(null)}
                footer={
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {b.userType === 'general' && <span className="tag" style={{ fontSize: 10, padding: '2px 6px', background: '#eee' }}>General User</span>}
                      {b.datingPreference === 'college_only' && <span className="tag" style={{ fontSize: 10, padding: '2px 6px', background: '#eef', color: '#00f' }}>College Only</span>}
                    </div>

                    {confirmedBoyUids.has(b.uid) ? (
                      <div className="tag" style={{ background: "#e8e8e8", color: "#555", textAlign: 'center' }}>Already revealed</div>
                    ) : (
                      <button
                        className="btn primary"
                        onClick={() => confirm(b.uid)}
                        disabled={confirmedBoyUids.has(b.uid)}
                      >
                        Select & Reveal
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </Carousel>
        )}
      </div>
    </>
  )
}