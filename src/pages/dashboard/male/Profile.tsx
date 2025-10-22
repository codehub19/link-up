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
  const requiredFields = [
    'name',
    'age',
    'gender',
    'college',
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
    // Add other required fields here if needed
  ]

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
                <span className="profile-header-name">{profile?.name}, {profile?.age}</span>
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
                      <circle cx="11" cy="11" r="9.2" stroke="#fff" strokeWidth="1.2" fill="none"/>
                    </svg>
                  </span>
                )}
              </div>
              <div className="profile-header-college">{profile?.college}</div>
              <button
                className="profile-header-edit-btn"
                onClick={() => nav('/dashboard/edit-profile')}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" style={{marginRight: 7}}>
                  <path d="M4 20h4l10-10-4-4L4 16v4z" fill="#232a38"/>
                </svg>
                <span>Edit profile</span>
              </button>
            </div>
          </div>
          <div className="profile-college-id">
            <EditCollegeId />
          </div>
        </div>
      </div>
    </>
  )
}