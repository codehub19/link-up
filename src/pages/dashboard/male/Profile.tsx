import React from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import EditCollegeId from '../EditCollegeId'
import MaleTabs from '../../../components/MaleTabs'
import HomeBackground from '../../../components/home/HomeBackground'
import '../dashboard.css'
import './Profile.styles.css'

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
        <MaleTabs />

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
                {/* Empty slots placeholders if needed, or just let grid flow */}
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
            {/* Support History Link */}
            <div className="profile-section-card" style={{ padding: 24, textAlign: 'center' }}>
              <button
                onClick={() => nav('/dashboard/support-history')}
                style={{
                  background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 500
                }}
              >
                View Support History &rarr;
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
