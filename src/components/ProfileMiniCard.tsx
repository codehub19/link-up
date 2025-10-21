import React, { useState } from 'react'

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

// Helper to decide if name/instagram should be revealed
function isRevealed() {
  // TODO: Plug in match status logic here. For now, always hidden.
  return false
}

export default function ProfileMiniCard({
  user,
  footer,
}: {
  user?: UserStructure
  footer?: React.ReactNode
}) {
  const [imgIdx, setImgIdx] = useState(0)
  const [showProfile, setShowProfile] = useState(false)

  const images =
    (user?.photoUrls && Array.isArray(user.photoUrls) ? user.photoUrls : [])
      .filter(Boolean)
      .slice(0, 4)

  const imageToShow =
    images.length > 0
      ? images[imgIdx]
      : user?.photoUrl
      ? user.photoUrl
      : "/placeholder.jpg"

  const age = user?.dob ? calculateAge(user.dob) : user?.age || ""

  // Progress bar for images
  const renderProgressBar = () => (
    <div className="pm-progress-bar">
      {images.map((_, i) => (
        <span key={i} className={`pm-progress-dot ${i === imgIdx ? 'active' : ''}`} />
      ))}
    </div>
  )

  // Interests below name, small font, less opacity background
  const renderInterestsBelowName = () => (
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
          <span
            key={t}
            className="pm-interest-pill"
          >{t}</span>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className="pm-card">
        <div className="pm-image-area">
          {renderProgressBar()}
          <img
            src={imageToShow}
            alt="profile"
            className="pm-card-img"
            draggable={false}
            onTouchStart={e => e.stopPropagation()}
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
            {renderInterestsBelowName()}
            <div className="pm-actions-row">
              {footer}
              <button className="pm-arrow-btn" aria-label="Expand profile" onClick={() => setShowProfile(true)}>
                <svg width="24" height="24" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="#232a38" />
                  <path d="M12 18l4-4 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>
          </div>
          {imgIdx > 0 && (
            <button className="pm-img-nav left" onClick={() => setImgIdx(imgIdx - 1)} aria-label="Previous photo" />
          )}
          {imgIdx < images.length - 1 && (
            <button className="pm-img-nav right" onClick={() => setImgIdx(imgIdx + 1)} aria-label="Next photo" />
          )}
        </div>
      </div>
      {/* Expanded view with multi-image support, image at top with same height as unexpanded */}
      {showProfile && (
        <div className="pm-expanded-popup">
          <div className="pm-expanded-inner">
            {/* IMAGE CAROUSEL AT TOP, SAME HEIGHT AS UNEXPANDED */}
            <div className="pm-expanded-images-carousel">
              {renderProgressBar()}
              <img src={images[imgIdx] || user?.photoUrl || "/placeholder.jpg"} alt="profile" className="pm-expanded-img" />
              {imgIdx > 0 && (
                <button className="pm-img-nav left" onClick={() => setImgIdx(imgIdx - 1)} aria-label="Previous photo" />
              )}
              {imgIdx < images.length - 1 && (
                <button className="pm-img-nav right" onClick={() => setImgIdx(imgIdx + 1)} aria-label="Next photo" />
              )}
            </div>
            <div className="pm-expanded-header">
              <span className="pm-card-name">
                {isRevealed() ? (user?.name ?? "Student") : "Hidden until matched"}
                {age ? `, ${age}` : ""}
              </span>
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
              <button className="pm-collapse-btn" aria-label="Collapse profile" onClick={() => setShowProfile(false)}>
                <svg width="22" height="22" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="#232a38" />
                  <path d="M20 14l-4 4-4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>
            <div className="pm-full-sections">
              {user?.bio && (
                <section className="pm-section">
                  <div className="pm-section-label">Bio</div>
                  <div className="pm-section-value">{user.bio}</div>
                </section>
              )}
              {user?.college && (
                <section className="pm-section">
                  <div className="pm-section-label">College</div>
                  <div className="pm-section-value">{user.college}</div>
                </section>
              )}
              {user?.loveLanguage && (
                <section className="pm-section">
                  <div className="pm-section-label">Love Language</div>
                  <div className="pm-section-value">{user.loveLanguage}</div>
                </section>
              )}
              {user?.travelPreference && (
                <section className="pm-section">
                  <div className="pm-section-label">Travel Preference</div>
                  <div className="pm-section-value">{user.travelPreference}</div>
                </section>
              )}
              {user?.sundayStyle && (
                <section className="pm-section">
                  <div className="pm-section-label">Sunday Style</div>
                  <div className="pm-section-value">{user.sundayStyle}</div>
                </section>
              )}
              {user?.communicationImportance && (
                <section className="pm-section">
                  <div className="pm-section-label">Communication Importance</div>
                  <div className="pm-section-value">{user.communicationImportance}</div>
                </section>
              )}
              {user?.conflictApproach && (
                <section className="pm-section">
                  <div className="pm-section-label">Conflict Approach</div>
                  <div className="pm-section-value">{user.conflictApproach}</div>
                </section>
              )}
              {user?.instagramId && user.instagramId.trim() && (
                <section className="pm-section">
                  <div className="pm-section-label">Instagram</div>
                  <div className="pm-section-value">
                    {isRevealed() ? `@${user.instagramId}` : "Hidden until matched"}
                  </div>
                </section>
              )}
              <section className="pm-section">
                <div className="pm-section-label">Interests</div>
                <div className="pm-interests-row">
                  {(user?.interests ?? []).map((t) => (
                    <span key={t} className="pm-interest-pill">{t}</span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .pm-card {
          background: #1a1a22;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 32px rgba(30,26,54,0.14);
          width: 100%;
          max-width: 370px;
          margin: 0 auto;
        }
        .pm-image-area {
          position: relative;
          width: 100%;
          height: 400px;
        }
        .pm-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 18px;
        }
        .pm-progress-bar {
          position: absolute;
          top: 16px;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 6px;
          z-index: 2;
        }
        .pm-progress-dot {
          width: 34px;
          height: 4px;
          border-radius: 3px;
          background: #232a38;
          opacity: 0.45;
        }
        .pm-progress-dot.active {
          background: #fff;
          opacity: 1;
        }
        .pm-img-nav {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 3;
        }
        .pm-img-nav.left { left: 0; }
        .pm-img-nav.right { right: 0; }
        .pm-card-info-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 18px 18px 14px 18px;
          background: linear-gradient(0deg,rgba(24,25,35,0.47) 94%,rgba(24,25,35,0.04) 100%);
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .pm-card-title-row {
          font-size: 1.22rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pm-card-name { font-size: 1.07rem; }
        .pm-card-age { font-size: 0.98rem; margin-left: 8px; color: #fff; font-weight: 500;}
        .pm-verified svg { vertical-align: middle; margin-left: 4px;}
        .pm-actions-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          width: 100%;
          margin-top: 12px;
          justify-content: flex-start;
        }
        .pm-arrow-btn {
          margin: 0;
          background: none;
          border: none;
          cursor: pointer;
          align-self: flex-end;
        }
        .pm-interests-label-row {
          margin-top: 8px;
          margin-bottom: 0;
        }
        .pm-interests-label {
          display: flex;
          align-items: center;
          font-size: 0.79rem;
          color: #fff;
          margin-bottom: 2px;
          font-weight: 600;
          opacity: 0.7;
        }
        .pm-interests-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          justify-content: flex-start;
        }
        .pm-interest-pill {
          padding: 3px 10px;
          border-radius: 16px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #fff;
          background: rgba(60,60,70,0.55);
          letter-spacing: 0.01em;
        }
        .pm-interest-pill.pink {
          background: linear-gradient(90deg,#ff5858,#f09819);
        }
        /* Expanded popup card */
        .pm-expanded-popup {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(24,25,35,0.97);
          pointer-events: auto;
        }
        .pm-expanded-inner {
          background: #191924;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(30,26,54,0.19);
          max-width: 420px;
          width: 99vw;
          padding: 0 0 28px 0;
          overflow-y: auto;
          position: relative;
          max-height: 98vh;
          display: flex;
          flex-direction: column;
        }
        .pm-expanded-images-carousel {
          position: relative;
          width: 100%;
        }
        .pm-expanded-img {
          width: 100%;
          height: 400px; /* SAME AS UNEXPANDED */
          object-fit: cover;
          border-radius: 14px 14px 0 0;
          margin-bottom: 0;
        }
        .pm-expanded-images-carousel .pm-progress-bar {
          position: absolute;
          top: 18px;
          left: 0;
          width: 100%;
          z-index: 10;
        }
        .pm-expanded-images-carousel .pm-img-nav {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 15;
        }
        .pm-expanded-images-carousel .pm-img-nav.left { left: 0; }
        .pm-expanded-images-carousel .pm-img-nav.right { right: 0; }
        .pm-expanded-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 1.13rem;
          font-weight: 700;
          color: #fff;
          padding: 20px 28px 0 28px;
        }
        .pm-section {
          margin: 0 28px 18px 28px;
        }
        .pm-section-label {
          font-size: 1.06rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
          opacity: 0.80;
        }
        .pm-section-value {
          font-size: 0.98rem;
          color: #fff;
          line-height: 1.5;
          font-weight: 500;
        }
        .pm-interests-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pm-collapse-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #fff;
        }
        @media (max-width: 600px) {
          .pm-card {
            max-width: 370px;
            border-radius: 18px;
            margin: 0 auto;
          }
          .pm-image-area {
            height: 400px;
          }
          .pm-card-img,
          .pm-expanded-img {
            height: 400px;
            border-radius: 14px 14px 0 0;
          }
          .pm-card-title-row { font-size: 1.22rem; }
          .pm-interests-label { font-size: 0.79rem; }
          .pm-interest-pill { font-size: 0.78rem; }
          .pm-actions-row { gap: 16px; margin-top: 12px;}
        }
      `}</style>
    </>
  )
}