import React from "react";
import { useNavigate } from "react-router-dom";
import './ProfileMatchCard.css';

type UserStructure = {
  uid: string
  name?: string
  dob?: string
  verified?: boolean
  interests?: string[]
  photoUrls?: string[]
  photoUrl?: string
  collegeId?: { verified?: boolean }
  age?: number
  bio?: string
  college?: string
  instagramId?: string
  loveLanguage?: string
  travelPreference?: string
  sundayStyle?: string
  communicationImportance?: string
  conflictApproach?: string
}

function calculateAge(dob?: string) {
  if (!dob) return ""
  const birth = new Date(dob)
  const now = new Date()
  return Math.floor(
    (now.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)
  )
}

export default function ProfileMatchCard({
  user,
  footer,
}: { user?: UserStructure; footer?: React.ReactNode }) {
  const navigate = useNavigate();
  const age = user?.dob ? calculateAge(user.dob) : user?.age || "";

  // Open profile view page
  const handleOpenProfile = () => {
    if (user?.uid) {
      navigate(`/profile/${user.uid}`);
    }
  };

  return (
    <div className="pm-card">
      <div className="pm-image-area">
        {/* Show only the profile photo as cover */}
        <img
          src={user?.photoUrl || "/placeholder.jpg"}
          alt="profile"
          className="pm-card-img"
          draggable={false}
          onClick={handleOpenProfile}
          style={{ cursor: "pointer" }}
        />
        <div className="pm-card-info-overlay">
          <div className="pm-card-title-row">
            <span className="pm-card-name">{user?.name ?? "Student"}</span>
            {age ? <span className="pm-card-age">{age}</span> : null}
            {(user?.verified || user?.collegeId?.verified) && (
              <span title="Verified" className="pm-verified">
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
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
          {/* Interests below name */}
          {(user?.interests?.length ?? 0) > 0 && (
            <div className="pm-interests-label-row">
              <div className="pm-interests-label">
                <svg width="13" height="13" viewBox="0 0 24 24" style={{marginRight: 5}} fill="none">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#fff" opacity="0.13"/>
                  <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Interests</span>
              </div>
              <div className="pm-interests-row">
                {(user?.interests ?? []).map((t) => (
                  <span key={t} className="pm-interest-pill">{t}</span>
                ))}
              </div>
            </div>
          )}
          <div className="pm-actions-row">
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}