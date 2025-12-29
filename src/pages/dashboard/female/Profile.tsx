import React from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import EditCollegeId from '../EditCollegeId'
import FemaleTabs from '../../../components/FemaleTabs'
import HomeBackground from '../../../components/home/HomeBackground'
import '../dashboard.css'
import '../male/Profile.styles.css' // Reusing the Male styles
import { getReferralStats, createReferralClaim, listPendingClaims, assignReferralCode } from '../../../services/referrals'
import { toast } from 'sonner'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../../firebase'

export default function ProfilePage() {
  const { profile } = useAuth()
  const nav = useNavigate()

  // Calculate display age
  const age = React.useMemo(() => {
    if (!profile?.dob) return ''
    const birth = new Date(profile.dob)
    const now = new Date()
    let a = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      a--
    }
    return a
  }, [profile?.dob])

  // Completion calculation
  const requiredFields = [
    'name', 'dob', 'gender', 'photoUrl', 'bio', 'interests', 'height'
  ]
  const filledFields = requiredFields.reduce((count, field) => {
    const value = profile?.[field]
    return count + (Array.isArray(value) ? (value.length > 0 ? 1 : 0) : (value ? 1 : 0))
  }, 0)
  const completion = Math.round((filledFields / requiredFields.length) * 100)

  // Icons
  const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  )

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )

  const PhotoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )

  const BioIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )

  const BasicsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )

  const HeartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  )

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        <FemaleTabs />

        <div className="profile-layout-grid">

          {/* --- LEFT COLUMN: Identity --- */}
          <div className="profile-left-col">
            <div className="profile-hero-card">
              <div className="profile-avatar-wrapper">
                {/* Progress Ring */}
                <svg className="profile-progress-svg" viewBox="0 0 170 170">
                  <circle cx="85" cy="85" r="74" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle
                    cx="85" cy="85" r="74" fill="none" stroke="url(#pGrad)"
                    strokeWidth="6" strokeDasharray={465} strokeDashoffset={465 - (465 * completion) / 100}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <defs>
                    <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                </svg>

                <img
                  src={profile?.photoUrl || '/placeholder.jpg'}
                  alt={profile?.name}
                  className="profile-avatar-img"
                />

                <div className="profile-completion-label">{completion}% Complete</div>
              </div>

              <div className="profile-identity">
                <div className="profile-name-row">
                  <h1 className="profile-name">{profile?.name}{age ? `, ${age}` : ''}</h1>
                  {profile?.verified && (
                    <span className="profile-verified-badge" title="Verified">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="currentColor" />
                        <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="profile-college">{profile?.college || 'No college listed'}</div>
              </div>

              <div className="profile-actions">
                <button className="profile-btn profile-btn-primary" onClick={() => nav('/dashboard/edit-profile')}>
                  <EditIcon /> Edit Profile
                </button>
                <button className="profile-btn profile-btn-secondary" onClick={() => nav('/dashboard/settings')}>
                  <SettingsIcon /> Settings
                </button>
              </div>
            </div>

            {/* ID Card (if college) */}
            <div className="profile-id-section">
              {profile?.userType === 'college' && <EditCollegeId />}
            </div>
          </div>

          {/* --- RIGHT COLUMN: Content --- */}
          <div className="profile-content-col">

            <ReferralCard user={profile} />

            {/* Photos Section */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <h3 className="profile-section-title"><span className="profile-section-icon"><PhotoIcon /></span> Photos</h3>
              </div>
              <div className="profile-photos-grid">
                {/* Photos Grid */}
                {(profile?.photoUrls && profile.photoUrls.length > 0 ? profile.photoUrls : (profile?.photoUrl ? [profile.photoUrl] : [])).map((url: string, idx: number) => (
                  <div key={idx} className="profile-photo-item">
                    <img src={url} alt={`Photo ${idx + 1}`} />
                  </div>
                ))}
                {(!profile?.photoUrls || profile.photoUrls.length === 0) && (
                  <div style={{ gridColumn: 'span 3', padding: '20px', color: 'gray', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #333', borderRadius: '12px' }}>
                    Add more photos in Edit Profile
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <h3 className="profile-section-title"><span className="profile-section-icon"><BioIcon /></span> About Me</h3>
              </div>
              <div className="profile-bio-text">
                {profile?.bio || "No bio yet. Tell us about yourself!"}
              </div>
            </div>

            {/* Basics Grid */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <h3 className="profile-section-title"><span className="profile-section-icon"><BasicsIcon /></span> The Basics</h3>
              </div>
              <div className="profile-basics-grid">
                <div className="profile-basic-item">
                  <span className="profile-basic-label">Height</span>
                  <span className="profile-basic-value">{profile?.height || '--'}</span>
                </div>
                <div className="profile-basic-item">
                  <span className="profile-basic-label">Gender</span>
                  <span className="profile-basic-value">{profile?.gender ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) : '--'}</span>
                </div>
                <div className="profile-basic-item">
                  <span className="profile-basic-label">Looking For</span>
                  <span className="profile-basic-value">{profile?.datingPreference === 'everyone' ? 'Everyone' : (profile?.datingPreference === 'women' ? 'Women' : 'Men')}</span>
                </div>
                <div className="profile-basic-item">
                  <span className="profile-basic-label">Distance</span>
                  <span className="profile-basic-value">{profile?.distancePreference ? `${profile.distancePreference} km` : '50 km'}</span>
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <h3 className="profile-section-title"><span className="profile-section-icon"><HeartIcon /></span> Interests</h3>
              </div>
              <div className="profile-interests-list">
                {profile?.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest: string, i: number) => (
                    <span key={i} className="profile-interest-pill">{interest}</span>
                  ))
                ) : (
                  <span style={{ color: 'gray' }}>No interests selected.</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

function ReferralCard({ user }: { user: any }) {
  const [stats, setStats] = React.useState<any>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const nav = useNavigate()

  // Local state for immediate feedback
  const [upiId, setUpiId] = React.useState(user?.upiId || '')
  const [isActivated, setIsActivated] = React.useState(!!user?.upiId)
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const refreshData = () => {
    if (user?.uid) {
      getReferralStats(user.uid).then(setStats)
      import('../../../services/referrals').then(({ getMyClaims }) => {
        getMyClaims(user.uid).then(claims => {
          claims.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setHistory(claims)
        })
      })

      if (!user.referralCode) {
        assignReferralCode(user.uid, user.name || 'User').catch(console.error)
      }
    }
  }

  React.useEffect(() => {
    refreshData()
  }, [user?.uid])

  const handleActivate = async () => {
    if (!upiId.trim() || !user?.uid) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { upiId: upiId.trim() })
      setIsActivated(true)
      toast.success('Referral program activated!')
      refreshData()
    } catch (e) {
      toast.error('Failed to save details')
    } finally {
      setLoading(false)
    }
  }

  // Calculate Financials
  const qualified = stats?.qualifiedReferrals || 0
  const paid = user?.referralEarningsPaid || 0
  const totalEarned = Math.min(qualified * 5, 50)

  // Calculate pending assertions
  const pendingAmount = history
    .filter(h => h.status === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0)

  // Available is strictly what is NOT paid AND NOT pending
  const available = Math.max(0, totalEarned - paid - pendingAmount)

  // Max Limit Reached?
  // If totalEarned is 50, and we have claimed everything (available is 0).
  const isMaxedOut = totalEarned >= 50 && available <= 0

  const handleClaim = async () => {
    if (!stats || !user?.uid) return
    if (available <= 0) return

    setSubmitting(true)
    try {
      await createReferralClaim(user.uid, available, upiId)
      toast.success('Claim submitted! Admin will verify.')
      refreshData()
    } catch (e) {
      toast.error('Claim failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (!user?.referralCode) return
    navigator.clipboard.writeText(user.referralCode)
    toast.success('Code copied')
  }

  const handleCopyLink = () => {
    if (!user?.referralCode) return
    const link = `${window.location.origin}/?ref=${user.referralCode}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied')
  }

  return (
    <div className="profile-section-card" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(20, 20, 20, 0.8))', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
      <div className="profile-section-header">
        <h3 className="profile-section-title">
          <span className="profile-section-icon" style={{ color: '#f472b6' }}>🎁</span> Refer & Earn
        </h3>
      </div>

      {!isActivated ? (
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 14, color: '#ddd', marginBottom: 16 }}>
            Earn <b style={{ color: '#f472b6' }}>₹5</b> for every friend who matches! (Max ₹50).
            <br />Enter your UPI ID to start.
          </p>
          <input
            className="field-input"
            placeholder="Enter UPI ID (e.g. user@okhdfc)"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <button
            className="profile-btn profile-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleActivate}
            disabled={loading}
          >
            {loading ? 'Activating...' : 'Start Earning'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 20px 20px' }}>

          {isMaxedOut ? (
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
              <h4 style={{ margin: '0 0 4px 0', color: '#f472b6' }}>Program Completed!</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
                You have earned the maximum limit of ₹50. Thank you for referring!
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: '#aaa', display: 'block' }}>Your Referral Code</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1, color: 'white' }}>{user?.referralCode || '---'}</span>
                    <button onClick={handleCopyCode} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} title="Copy Code">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button onClick={handleCopyLink} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} title="Copy Link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Signups</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>{stats?.totalReferrals || 0}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Matched</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>{qualified}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Available</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#4ade80' }}>₹{available}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 16, padding: '0 4px' }}>
                <span>Total Limit: ₹50</span>
                <span>Claimed: ₹{paid + pendingAmount}</span>
              </div>

              <button
                className="profile-btn profile-btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: available > 0 ? '#10b981' : '#333', borderColor: available > 0 ? '#059669' : '#444', cursor: available > 0 ? 'pointer' : 'not-allowed' }}
                onClick={handleClaim}
                disabled={submitting || available <= 0}
              >
                {submitting ? 'Claiming...' : available > 0 ? `Claim ₹${available}` : 'No earnings to claim'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}


