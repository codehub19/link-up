import React from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import EditCollegeId from '../EditCollegeId'
import MaleTabs from '../../../components/MaleTabs'
import '../dashboard.css'

export default function ProfilePage() {
  const { profile } = useAuth()
  const nav = useNavigate()

  // List of required fields to consider for profile completion
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
      <Navbar />
      <div className="container">
        <MaleTabs />
        <div className="profile-main-section">
          {/* TOP PART */}
          <div className="profile-header-row-container">
            <div className="profile-header-img-progress">
              <div className="profile-header-img-wrap">
                <svg className="profile-header-progress" viewBox="0 0 170 170" width="170" height="170">
                  <circle
                    cx="85"
                    cy="85"
                    r="74"
                    fill="none"
                    stroke="#232a38"
                    strokeWidth="14"
                  />
                  <circle
                    cx="85"
                    cy="85"
                    r="74"
                    fill="none"
                    stroke="url(#profileCircleGradient)"
                    strokeWidth="14"
                    strokeDasharray={464.96}
                    strokeDashoffset={464.96 - (464.96 * completion) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.7s' }}
                  />
                  <defs>
                    <linearGradient id="profileCircleGradient" x1="0" y1="0" x2="170" y2="0">
                      <stop offset="0%" stopColor="#ff5d7c" />
                      <stop offset="100%" stopColor="#ea3d3d" />
                    </linearGradient>
                  </defs>
                </svg>
                <img
                  src={profile?.photoUrl || '/placeholder.jpg'}
                  alt={profile?.name}
                  className="profile-header-img"
                />
                <div className="profile-header-progress-label-wrap">
                  <span className="profile-header-progress-label">{completion}%</span>
                </div>
              </div>
            </div>
            <div className="profile-header-details">
              <div className="profile-header-name-row">
                <span className="profile-header-name">{profile?.name}, {age}</span>
                {profile?.verified && (
                  <span className="profile-header-verified" title="Verified">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="11" r="10" fill="#2196F3" />
                      <path
                        d="M7.7 11.8l2.1 2.1 4.1-4.1"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="11" cy="11" r="9.2" stroke="#fff" strokeWidth="1.2" fill="none" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="profile-header-college">{profile?.college}</div>
              <button
                className="profile-header-edit-btn"
                onClick={() => nav('/dashboard/edit-profile')}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" style={{ marginRight: 7 }}>
                  <path d="M4 20h4l10-10-4-4L4 16v4z" fill="#232a38" />
                </svg>
                <span>Edit profile</span>
              </button>
              <button
                className="profile-header-edit-btn"
                style={{ marginLeft: 8, padding: '0 10px' }}
                onClick={() => nav('/dashboard/settings')}
                title="Settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#232a38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="profile-college-id">
            {profile?.userType === 'college' && <EditCollegeId />}
          </div>
        </div>
      </div>
    </>
  )
}