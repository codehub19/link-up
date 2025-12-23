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
import HomeBackground from '../../../components/home/HomeBackground'
import '../male/Rounds.styles.css'
import '../dashboard.css'

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
        <HomeBackground />
        <Navbar />
        <div className="dashboard-container">
          <FemaleTabs />
          <div className="rounds-hero">
            <h1 className="rounds-title">Upcoming Rounds</h1>
          </div>
          <div className="rounds-empty-card">
            <div className="rounds-empty-title">Next Round Coming Soon</div>
            <p className="rounds-empty-text">We'll notify you when it's live.</p>
            <Link className="rounds-action-btn" to="/dashboard/connections">View My Connections</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        <FemaleTabs />

        <div className="rounds-hero">
          <h1 className="rounds-title text-gradient">Matching Round</h1>
          {/* Subheading */}
          <p className="rounds-subtitle">See who liked you and reveal your match.</p>
          {/* Show round live badge if round is live */}
          {roundStatus.live && (
            <div style={{ marginTop: '1rem' }}>
              <div className="live-round-badge">
                {roundStatus.phase === 'boys' ? "Boys' Round Live" : "Girls' Round Live"}
              </div>
            </div>
          )}
        </div>

        <div className="rounds-info-banner">
          Boys who liked you this round. Select and reveal to match!
        </div>

        {boyUids.length === 0 ? (
          <div className="rounds-empty-card" style={{ padding: '2rem' }}>
            <p className="rounds-empty-text">No boys have liked your profile yet this round.</p>
          </div>
        ) : boys.length === 0 ? (
          <div className="rounds-empty-card" style={{ padding: '2rem' }}>
            <p className="rounds-empty-text">Loading profiles...</p>
          </div>
        ) : (
          <div className="rounds-carousel-wrapper">
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
                        {b.userType === 'general' && <span className="tag-general">General User</span>}
                        {b.datingPreference === 'college_only' && <span className="tag-college-only">College Only</span>}
                      </div>

                      {confirmedBoyUids.has(b.uid) ? (
                        <button
                          className="btn ghost"
                          disabled
                          style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#ddd',
                            marginTop: '8px'
                          }}
                        >
                          Already Revealed
                        </button>
                      ) : (
                        <button
                          className="btn nav-btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            border: 'none',
                            background: 'var(--grad-primary)',
                            color: 'white',
                            marginTop: '8px',
                            cursor: 'pointer'
                          }}
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
          </div>
        )}
      </div>
    </>
  )
}