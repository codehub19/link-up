import React from 'react'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import EditCollegeId from '../EditCollegeId'
import MaleTabs from '../../../components/MaleTabs'

export default function ProfilePage() {
  const { profile } = useAuth()
  const nav = useNavigate()

  // Completion percent logic
  const completion = profile?.completion ?? 20

  return (
    <>
      <Navbar />
      <div className="profile-main-section">
        <MaleTabs />
        {/* TOP PART */}
        <div className="profile-topbar-responsive">
          <div className="profile-topbar-photo-progress">
            <div className="profile-topbar-photo-wrap">
              <img
                src={profile?.photoUrl || '/placeholder.jpg'}
                alt={profile?.name}
                className="profile-topbar-img"
              />
              <svg className="profile-topbar-progress" viewBox="0 0 140 140" width="140" height="140">
                <circle
                  cx="70"
                  cy="70"
                  r="62"
                  fill="none"
                  stroke="#232a38"
                  strokeWidth="9"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="62"
                  fill="none"
                  stroke="#ff5d7c"
                  strokeWidth="9"
                  strokeDasharray={389.56}
                  strokeDashoffset={389.56 - (389.56 * completion) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.7s' }}
                />
              </svg>
              <div className="profile-topbar-progress-label-wrap">
                <span className="profile-topbar-progress-label">{completion}%</span>
              </div>
            </div>
          </div>
          <div className="profile-topbar-details">
            <span className="profile-topbar-name">{profile?.name}, {profile?.age}</span>
            <button className="profile-topbar-edit-btn" onClick={() => nav('/dashboard/edit-profile')}>
              <svg width="20" height="20" viewBox="0 0 24 24">
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
      <style>{`
        .profile-main-section {
          padding: 32px 0 22px 0;
          border-radius: 20px;
          margin-top: 24px;
        }
        .profile-topbar-responsive {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 12px;
        }
        .profile-topbar-photo-progress {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .profile-topbar-photo-wrap {
          position: relative;
          width: 140px;
          height: 140px;
          margin-bottom: 9px;
        }
        .profile-topbar-img {
          width: 108px;
          height: 108px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #232a38;
          position: absolute;
          top: 16px;
          left: 16px;
          box-shadow: 0 4px 20px 0 #15131d55;
        }
        .profile-topbar-progress {
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .profile-topbar-progress-label-wrap {
          position: absolute;
          left: 50%;
          bottom: -18px;
          transform: translateX(-50%);
          width: 70px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.2px solid #ff5d7c;
          border-radius: 19px;
          color: #fff;
          font-size: 1.15rem;
          font-weight: 700;
          box-shadow: 0 2px 10px 0 #232a3870;
        }
        .profile-topbar-progress-label {
          font-size: 1.08rem;
          font-weight: 700;
        }
        .profile-topbar-details {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 12px;
        }
        .profile-topbar-name {
          font-size: 1.32rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.13;
          letter-spacing: -0.5px;
          text-shadow: 0 3px 12px #232a3860;
          margin-bottom: 10px;
        }
        .profile-topbar-edit-btn {
          background: #fff;
          color: #232a38;
          border: none;
          border-radius: 22px;
          padding: 7px 18px;
          font-weight: 700;
          font-size: 1.03rem;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(30,26,54,0.10);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .profile-topbar-edit-btn span {
          font-weight: 700;
        }
        .profile-topbar-edit-btn:hover {
          background: #ff5d7c;
          color: #fff;
        }
        .profile-college-id {
          margin-top: 18px;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        @media (max-width: 650px) {
          .profile-main-section {
            border-radius: 0;
            padding: 12px 0 13px 0;
          }
          .profile-topbar-responsive {
            margin-bottom: 4px;
          }
          .profile-topbar-photo-wrap {
            width: 90vw;
            height: 90vw;
            max-width: 220px;
            max-height: 220px;
            min-width: 150px;
            min-height: 150px;
          }
          .profile-topbar-img {
            width: 70vw;
            height: 70vw;
            max-width: 140px;
            max-height: 140px;
            min-width: 108px;
            min-height: 108px;
            left: 10vw;
            top: 10vw;
          }
          .profile-topbar-progress {
            width: 90vw;
            height: 90vw;
            max-width: 220px;
            max-height: 220px;
          }
          .profile-topbar-progress-label-wrap {
            width: 64px;
            height: 28px;
            font-size: 1rem;
            left: 50%;
            bottom: -13px;
          }
          .profile-topbar-details {
            margin-top: 7vw;
          }
          .profile-topbar-name {
            font-size: 1.09rem;
            margin-bottom: 8px;
          }
          .profile-topbar-edit-btn {
            font-size: 0.98rem;
            padding: 7px 11px;
          }
        }
      `}</style>
    </>
  )
}