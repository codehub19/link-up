import React from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import EditCollegeId from '../EditCollegeId'
import FemaleTabs from '../../../components/FemaleTabs'
import HomeBackground from '../../../components/home/HomeBackground'
import '../dashboard.css'
import '../male/Profile.styles.css' // Reusing the Male styles

export default function ProfilePage() {
  const { profile } = useAuth()
  const nav = useNavigate()

  // List of required fields to consider for profile completion
  let requiredFields = [
    'name',
    'dob', // Use dob instead of age
    'gender',
    // 'college', // Conditionally added below
    'photoUrl',
    'bio',
    'interests',
    'instagramId',
    'height',
    'loveLanguage',
    'travelPreference',
    'sundayStyle',
    'communicationImportance',
    'conflictApproach',
  ]

  // Add college only if user is a valid college student
  if (!profile?.userType || profile.userType === 'college') {
    requiredFields.push('college')
  }

  // Count how many required fields are filled
  const filledFields = requiredFields.reduce((count, field) => {
    const value = profile?.[field]
    if (Array.isArray(value)) {
      return count + (value.length > 0 ? 1 : 0)
    }
    return count + (value ? 1 : 0)
  }, 0)

  const completion = requiredFields.length > 0
    ? Math.round((filledFields / requiredFields.length) * 100)
    : 0

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

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        <FemaleTabs />

        <div className="profile-main-section">
          {/* Glassmorphic Hero Card */}
          <div className="profile-hero-card">

            {/* Avatar with Progress Ring */}
            <div className="profile-avatar-wrapper">
              <svg className="profile-progress-svg" viewBox="0 0 170 170" width="170" height="170">
                <circle
                  cx="85"
                  cy="85"
                  r="74"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="85"
                  cy="85"
                  r="74"
                  fill="none"
                  stroke="url(#profileCircleGradient)"
                  strokeWidth="6"
                  strokeDasharray={464.96}
                  strokeDashoffset={464.96 - (464.96 * completion) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
                />
                <defs>
                  <linearGradient id="profileCircleGradient" x1="0" y1="0" x2="170" y2="0">
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

              <div className="profile-completion-label">
                {completion}% Complete
              </div>
            </div>

            {/* User Info */}
            <div className="profile-user-info">
              <div className="profile-name-row">
                <h1 className="profile-name">{profile?.name}{age ? `, ${age}` : ''}</h1>
                {profile?.verified && (
                  <span className="profile-verified-badge" title="Verified Student">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="currentColor" />
                      <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>

              <div className="profile-college">{profile?.college || 'Update your college'}</div>

              <div className="profile-actions">
                <button
                  className="profile-btn profile-btn-primary"
                  onClick={() => nav('/dashboard/edit-profile')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Profile
                </button>

                <button
                  className="profile-btn profile-btn-secondary"
                  onClick={() => nav('/dashboard/settings')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Settings
                </button>
              </div>
            </div>

            {/* ID Card section */}
            <div className="profile-id-section">
              {profile?.userType === 'college' && <EditCollegeId />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}