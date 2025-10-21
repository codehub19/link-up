import React, { useState, useRef, useEffect } from 'react'

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

function isRevealed() {
  return false
}

const AUTO_SLIDE_INTERVAL = 3500 // ms

export default function ProfileMiniCard({
  user,
  footer,
  expanded,
  onExpand,
  onCollapse
}: { user?: UserStructure; footer?: React.ReactNode; expanded?: boolean; onExpand?: () => void; onCollapse?: () => void }) {
  const [imgIdx, setImgIdx] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null)
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

  // Auto-slide and progress bar logic
  useEffect(() => {
    setProgress(0)
    if (images.length > 1) {
      intervalRef.current && clearInterval(intervalRef.current)
      autoSlideRef.current && clearTimeout(autoSlideRef.current)
      let start = Date.now()
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - start
        setProgress(Math.min(elapsed / AUTO_SLIDE_INTERVAL, 1))
      }, 50)
      autoSlideRef.current = setTimeout(() => {
        setImgIdx((prev) => (prev + 1) % images.length)
      }, AUTO_SLIDE_INTERVAL)
      return () => {
        intervalRef.current && clearInterval(intervalRef.current)
        autoSlideRef.current && clearTimeout(autoSlideRef.current)
      }
    } else {
      setProgress(0)
    }
  }, [imgIdx, images.length, expanded])

  useEffect(() => {
    setImgIdx(0)
  }, [user?.uid, expanded])

  // Progress bar for images with filling effect
  const renderProgressBar = () => (
    <div className="pm-progress-bar">
      {images.map((_, i) => (
        <span key={i} className={`pm-progress-dot${i === imgIdx ? " active" : ""}`}>
          {i === imgIdx ? (
            <span
              className="pm-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          ) : null}
        </span>
      ))}
    </div>
  )

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
          <span key={t} className="pm-interest-pill">{t}</span>
        ))}
      </div>
    </div>
  )

  const collapsedContent = (
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
            <button className="pm-arrow-btn" aria-label="Expand profile" onClick={() => onExpand?.()}>
              <svg width="28" height="28" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="#232a38" />
                <path d="M12 18l4-4 4 4" stroke="#ff5d7c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
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
  )

  const expandedContent = (
    <div className="pm-expanded-popup">
      <div className="pm-expanded-inner">
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
        <div className="pm-expanded-header modern">
          <span className="pm-card-name modern">
            {isRevealed() ? (user?.name ?? "Student") : (
              <span className="pm-hidden-name">Hidden until matched</span>
            )}
            {age ? <span className="pm-card-age modern">, {age}</span> : ""}
          </span>
          {(user?.verified || user?.collegeId?.verified) && (
            <span title="Verified" className="pm-verified modern">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
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
          <button className="pm-collapse-btn modern" aria-label="Collapse profile" onClick={() => onCollapse?.()}>
            <svg width="24" height="24" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="#232a38" />
              <path d="M20 14l-4 4-4-4" stroke="#ff5d7c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        <div className="pm-full-sections modern">
          {user?.bio && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Bio</div>
              <div className="pm-section-value modern">{user.bio}</div>
            </section>
          )}
          {user?.college && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">College</div>
              <div className="pm-section-value modern">{user.college}</div>
            </section>
          )}
          {user?.loveLanguage && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Love Language</div>
              <div className="pm-section-value modern">{user.loveLanguage}</div>
            </section>
          )}
          {user?.travelPreference && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Travel Preference</div>
              <div className="pm-section-value modern">{user.travelPreference}</div>
            </section>
          )}
          {user?.sundayStyle && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Sunday Style</div>
              <div className="pm-section-value modern">{user.sundayStyle}</div>
            </section>
          )}
          {user?.communicationImportance && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Communication Importance</div>
              <div className="pm-section-value modern">{user.communicationImportance}</div>
            </section>
          )}
          {user?.conflictApproach && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Conflict Approach</div>
              <div className="pm-section-value modern">{user.conflictApproach}</div>
            </section>
          )}
          {user?.instagramId && user.instagramId.trim() && (
            <section className="pm-section modern">
              <div className="pm-section-label modern">Instagram</div>
              <div className="pm-section-value modern">
                {isRevealed() ? (
                  <>
                    <span className="pm-ig">@{user.instagramId}</span>
                  </>
                ) : (
                  <span className="pm-ig-hidden">Hidden until matched</span>
                )}
              </div>
            </section>
          )}
          <section className="pm-section modern">
            <div className="pm-section-label modern">Interests</div>
            <div className="pm-interests-row modern">
              {(user?.interests ?? []).map((t) => (
                <span key={t} className="pm-interest-pill modern">{t}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {collapsedContent}
      {expanded && expandedContent}
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
          position: relative;
          overflow: hidden;
        }
        .pm-progress-dot.active {
          background: #ff5d7c;
          opacity: 1;
        }
        .pm-progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: #fff;
          border-radius: 3px;
          transition: width 0.15s linear;
          z-index: 1;
          pointer-events: none;
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
          background: #232a38;
          border: none;
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(30,26,54,0.10);
          transition: background 0.2s;
        }
        .pm-arrow-btn:hover, .pm-arrow-btn:focus {
          background: #ff5d7c;
        }
        .pm-arrow-btn svg {
          display: block;
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
          transition: background 0.2s, color 0.2s;
        }
        .pm-interest-pill.modern {
          background: linear-gradient(90deg,#232a38, #22223b);
          color: #eaeaea;
        }
        .pm-interest-pill.pink {
          background: linear-gradient(90deg,#ff5858,#f09819);
          color: #fff;
        }
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
          background: #181923;
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
          height: 400px;
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
        .pm-expanded-header.modern {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #ff5d7c;
          padding: 20px 28px 0 28px;
          letter-spacing: 0.03em;
        }
        .pm-card-name.modern, .pm-section-label.modern {
          font-family: 'Montserrat', 'Inter', 'Segoe UI', sans-serif;
          font-size: 1.15rem;
          font-weight: 800;
          color: #ff5d7c;
          letter-spacing: 0.02em;
        }
        .pm-card-age.modern {
          font-family: 'Inter', 'Montserrat', 'Segoe UI', sans-serif;
          font-weight: 700;
          font-size: 1.03rem;
          color: #eaeaea;
          letter-spacing: 0.01em;
        }
        .pm-hidden-name {
          color: #eaeaea;
          font-family: 'Inter', 'Montserrat', sans-serif;
          font-weight: 700;
          opacity: 0.85;
        }
        .pm-verified.modern {
          margin-left: 6px;
          vertical-align: middle;
        }
        .pm-collapse-btn.modern {
          background: #232a38;
          border: none;
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(30,26,54,0.08);
          transition: background 0.2s;
        }
        .pm-collapse-btn.modern:hover, .pm-collapse-btn.modern:focus {
          background: #ff5d7c;
        }
        .pm-collapse-btn.modern svg {
          display: block;
        }
        .pm-section.modern {
          margin: 0 28px 18px 28px;
          background: none;
        }
        .pm-section-label.modern {
          font-size: 1.06rem;
          font-weight: 800;
          color: #ff5d7c;
          font-family: 'Montserrat', 'Inter', 'Segoe UI', sans-serif;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
          opacity: 0.95;
        }
        .pm-section-value.modern {
          font-size: 1.05rem;
          color: #eaeaea;
          line-height: 1.6;
          font-weight: 500;
          font-family: 'Inter', 'Montserrat', 'Segoe UI', sans-serif;
          background: none;
        }
        .pm-ig {
          color: #fff;
          background: #ff5d7c;
          border-radius: 6px;
          padding: 2px 10px;
          font-weight: 700;
          font-size: 1rem;
          font-family: 'Inter', 'Montserrat', 'Segoe UI', sans-serif;
        }
        .pm-ig-hidden {
          color: #eaeaea;
          font-weight: 500;
          font-size: 0.96rem;
          opacity: 0.7;
        }
        .pm-interests-row.modern {
          gap: 8px;
        }
        .pm-interest-pill.modern {
          background: linear-gradient(90deg,#232a38, #22223b);
          color: #ff5d7c;
          border: 1px solid #232a38;
          font-weight: 700;
          padding: 4px 14px;
          font-size: 0.89rem;
          border-radius: 16px;
          letter-spacing: 0.04em;
          font-family: 'Montserrat', 'Inter', 'Segoe UI', sans-serif;
          transition: background 0.2s, color 0.2s;
        }
        .pm-interest-pill.modern.pink {
          background: linear-gradient(90deg,#ff5858,#f09819);
          color: #fff;
        }
        @media (max-width: 700px) {
          .pm-card, .pm-expanded-inner {
            max-width: 99vw;
          }
          .pm-image-area, .pm-expanded-img {
            height: 400px;
          }
        }
        @media (max-width: 400px) {
          .pm-image-area, .pm-expanded-img {
            height: 400px;
          }
        }
      `}</style>
    </>
  )
}