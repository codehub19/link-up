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
import { Link } from 'react-router-dom'
import HomeBackground from '../../../components/home/HomeBackground'
import './Rounds.styles.css'
import '../dashboard.css' // Ensure generic dashboard styles are loaded

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
  height?: string
}

type SubscriptionDoc = {
  status: string // 'active', 'expired', etc.
  planId?: string
  validUntil?: any // timestamp
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

export default function MatchingRounds() {
  const { user, profile } = useAuth()
  const [roundId, setRoundId] = useState<string | null>(null)
  const [roundObj, setRoundObj] = useState<any | null>(null)
  const [assignedUids, setAssignedUids] = useState<string[]>([])
  const [girls, setGirls] = useState<UserDoc[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [subscription, setSubscription] = useState<SubscriptionDoc | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [hasAnySubscription, setHasAnySubscription] = useState<boolean>(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

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
        if (!s.empty) {
          const userData = s.docs[0].data() as UserDoc
          users.push(userData)
        }
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

      setGirls(filteredProfiles)
    }
    run()
  }, [assignedUids, profile])

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
          <MaleTabs />
          <div className="rounds-hero">
            <h1 className="rounds-title">Upcoming Rounds</h1>
          </div>
          <div className="rounds-empty-card">
            <div className="rounds-empty-title">Next Round Coming Soon</div>
            <p className="rounds-empty-text">We're curating the best matches for you. We'll notify you as soon as the next round goes live!</p>
            <Link className="rounds-action-btn" to="/dashboard/matches">View My Connections</Link>
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
        <MaleTabs />

        <div className="rounds-hero">
          <h1 className="rounds-title text-gradient">Matching Round</h1>
          {/* Subheading */}
          <p className="rounds-subtitle">Discover your curated matches for this round.</p>
          {/* Show round live badge if round is live */}
          {roundStatus.live && (
            <div style={{ marginTop: '1rem' }}>
              <div className="live-round-badge">
                {roundStatus.phase === 'boys' ? "Boys' Round Live" : "Girls' Round Live"}
              </div>
            </div>
          )}
        </div>

        {!loadingSub && (
          !hasAnySubscription ? (
            <div className="rounds-empty-card">
              <div className="rounds-empty-title">Ready to Match?</div>
              <p className="rounds-empty-text">Purchase your first plan to join the exclusive matching rounds and find verified students.</p>
              <a className="rounds-action-btn" href="/dashboard/plans">Purchase Plan</a>
            </div>
          ) : !hasActivePlan ? (
            <div className="rounds-empty-card">
              <div className="rounds-empty-title">Plan Expired</div>
              <p className="rounds-empty-text">Your membership has expired. Renew your plan to unlock this round and continue matching.</p>
              <a className="rounds-action-btn" href="/dashboard/plans">Upgrade Plan</a>
            </div>
          ) : (
            <>
              <div className="rounds-info-banner">
                Curated profiles assigned to you this round. Like your favorites to connect!
              </div>

              {assignedUids.length === 0 ? (
                <div className="rounds-empty-card" style={{ padding: '2rem' }}>
                  <p className="rounds-empty-text">No profiles assigned to you yet. Please check back shortly.</p>
                </div>
              ) : girls.length === 0 ? (
                <div className="rounds-empty-card" style={{ padding: '2rem' }}>
                  <p className="rounds-empty-text">Loading your matches...</p>
                </div>
              ) : (
                <div className="rounds-carousel-wrapper">
                  <Carousel onChange={handleCarouselChange}>
                    {girls.map((g, idx) => (
                      <ProfileMiniCard
                        key={g.uid}
                        user={g}
                        expanded={expandedIdx === idx}
                        onExpand={() => setExpandedIdx(idx)}
                        onCollapse={() => setExpandedIdx(null)}
                        maskPrivateDetails={true}
                        footer={
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8 }}>
                            {/* Badges */}
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {g.userType === 'general' && <span className="tag-general">General User</span>}
                              {g.datingPreference === 'college_only' && <span className="tag-college-only">College Only</span>}
                            </div>

                            <button
                              className={`btn ${liked.has(g.uid) ? 'ghost' : 'nav-btn-primary'}`} // using text/primary btn
                              style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '12px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: liked.has(g.uid) ? 'default' : 'pointer',
                                background: liked.has(g.uid) ? 'rgba(255,255,255,0.1)' : 'var(--grad-primary)',
                                color: 'white',
                                marginTop: '8px'
                              }}
                              onClick={() => like(g.uid)}
                              disabled={liked.has(g.uid)}
                            >
                              {liked.has(g.uid) ? 'Liked' : 'Like Profile'}
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </Carousel>
                </div>
              )}
            </>
          )
        )}
      </div>
    </>
  )
}