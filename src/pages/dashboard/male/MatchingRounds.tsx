import Navbar from '../../../components/Navbar'
import MaleTabs from '../../../components/MaleTabs'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { getActiveRound } from '../../../services/rounds'
import { getAssignedGirlsForBoy } from '../../../services/assignments'
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'
import { db, callJoinMatchingRound } from '../../../firebase'
import { getActiveSubscription, formatPremiumUntil, type ActiveSubscription } from '../../../services/subscriptions'
import ProfileMiniCard from '../../../components/ProfileMiniCard'
import Carousel from '../../../components/Carousel'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import HomeBackground from '../../../components/home/HomeBackground'
import './Rounds.styles.css'
import '../dashboard.css' // Ensure generic dashboard styles are loaded
import EmptyState from '../../../components/ui/EmptyState'

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
  // Rounds are free; Premium only gives priority
  const [premium, setPremium] = useState<ActiveSubscription | null>(null)
  const [inRound, setInRound] = useState(false)
  const [joining, setJoining] = useState(false)
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

  useEffect(() => {
    if (!user) return
    getActiveSubscription(user.uid).then(setPremium).catch(() => setPremium(null))
  }, [user])

  useEffect(() => {
    setInRound(!!user && Array.isArray(roundObj?.participatingMales) && roundObj.participatingMales.includes(user.uid))
  }, [roundObj, user])

  const joinRound = async () => {
    if (!roundId) return
    setJoining(true)
    try {
      await callJoinMatchingRound({ roundId })
      setInRound(true)
      toast.success("You're in! Profiles will appear here once this round's picks are ready.")
    } catch (e: any) {
      toast.error(e?.message || 'Could not join the round')
    } finally {
      setJoining(false)
    }
  }

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
          <EmptyState
            icon="calendar"
            title="Next round is coming soon"
            text="We’re curating the next set of profiles. We’ll notify you the moment the round goes live."
            actions={[{ label: 'Start a random call', to: '/dashboard/random-call' }, { label: 'My matches', to: '/dashboard/matches', ghost: true }]}
          />
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

        {!inRound ? (
            <EmptyState
              icon="sparkle"
              title="Join this round — it’s free"
              text={<>We’ll suggest a few compatible profiles for you. Like the ones you’re into — if she likes you back, it’s a match.{!premium && <><br /><br />Want to stand out? <Link to="/dashboard/plans">Premium</Link> members are shown first.</>}</>}
              actions={[{ label: joining ? 'Joining…' : 'Join round', onClick: () => { if (!joining) joinRound() } }]}
            />
          ) : (
            <>
              <div className="rounds-info-banner">
                {premium
                  ? `⭐ Premium${formatPremiumUntil(premium) ? ` until ${formatPremiumUntil(premium)}` : ''} — you're shown first to women this round. Like your favorites to connect!`
                  : <>Curated profiles for you this round. Like your favorites to connect! <Link to="/dashboard/plans">Get Premium</Link> to be shown first.</>}
              </div>

              {assignedUids.length === 0 ? (
                <EmptyState
                  icon="sparkle"
                  title="Your profiles are on the way"
                  text="We’re picking compatible profiles for you this round. We’ll notify you as soon as they’re ready."
                />
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
          )}
      </div>
    </>
  )
}