import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import "./ProfileMiniCard.styles.css";

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

const AUTO_SLIDE_INTERVAL = 4000 // ms

export default function ProfileMiniCard({
  user,
  footer,
  expanded,
  onExpand,
  onCollapse
}: { user?: UserStructure; footer?: React.ReactNode; expanded?: boolean; onExpand?: () => void; onCollapse?: () => void }) {
  const [imgIdx, setImgIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null)

  const images = (user?.photoUrls && Array.isArray(user.photoUrls) ? user.photoUrls : [])
    .filter(Boolean)
    .slice(0, 5) // Max 5 images

  const imageToShow = images.length > 0
    ? images[imgIdx]
    : user?.photoUrl
      ? user.photoUrl
      : "/placeholder.jpg"

  const age = user?.dob ? calculateAge(user.dob) : user?.age || ""

  // Auto-slide logic
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

  // Reset index on user change
  useEffect(() => { setImgIdx(0) }, [user?.uid])

  // --- Render Helpers ---

  const renderProgressBar = () => (
    <div className="pm-progress-bar">
      {images.length > 1 && images.map((_, i) => (
        <div key={i} className="pm-progress-dot">
          {i === imgIdx && (
            <div className="pm-progress-fill" style={{ width: `${progress * 100}%` }} />
          )}
          {i < imgIdx && (
            <div className="pm-progress-fill" style={{ width: `100%` }} />
          )}
        </div>
      ))}
    </div>
  )

  const renderVerifiedBadge = () => (
    (user?.verified || user?.collegeId?.verified) ? (
      <span className="pm-verified" title="Verified Student">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
        </svg>
      </span>
    ) : null
  )

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx(prev => (prev + 1) % images.length);
  }

  // --- Main Card Content ---

  const collapsedContent = (
    <div className="pm-card">
      <div className="pm-image-area" onClick={() => onExpand?.()}>
        {renderProgressBar()}
        <img src={imageToShow} alt="profile" className="pm-card-img" />

        {/* Navigation Zones */}
        {images.length > 1 && (
          <>
            <button className="pm-img-nav left" onClick={handlePrev} aria-label="Previous" />
            <button className="pm-img-nav right" onClick={handleNext} aria-label="Next" />
          </>
        )}

        <div className="pm-card-info-overlay">
          <div className="pm-card-title-row">
            <span className="pm-card-name">{user?.name ?? "Student"}</span>
            {age && <span className="pm-card-age">, {age}</span>}
            {renderVerifiedBadge()}
          </div>

          <div className="pm-interests-preview">
            {user?.interests?.slice(0, 3).map(interest => (
              <span key={interest} className="pm-interest-tag">{interest}</span>
            ))}
            {(user?.interests?.length || 0) > 3 && (
              <span className="pm-interest-tag">+{(user?.interests?.length || 0) - 3}</span>
            )}
          </div>

          <div className="pm-actions-row">
            <div className="pm-action-slot">
              {footer} {/* Insert buttons here */}
            </div>
            <button className="pm-expand-btn" onClick={(e) => { e.stopPropagation(); onExpand?.(); }} aria-label="View Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Smooth expand/collapse logic
  const [renderExpanded, setRenderExpanded] = useState(!!expanded)
  const [animateOpen, setAnimateOpen] = useState(!!expanded)

  useEffect(() => {
    if (expanded) {
      setRenderExpanded(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateOpen(true))
      })
    } else {
      setAnimateOpen(false)
      const t = setTimeout(() => {
        setRenderExpanded(false)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [expanded])

  const [lightboxOpen, setLightboxOpen] = useState(false)

  // --- Lightbox Portal ---
  const lightbox = lightboxOpen && ReactDOM.createPortal(
    <div className={`pm-lightbox ${lightboxOpen ? 'open' : ''}`} onClick={() => setLightboxOpen(false)}>
      <button className="pm-lightbox-close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <img src={imageToShow} alt="Full view" onClick={e => e.stopPropagation()} />
    </div>,
    document.body
  )

  // --- Expanded Modal Content ---

  const expandedContent = (
    <div className={`pm-popup-overlay ${animateOpen ? 'open' : ''}`} onClick={onCollapse}>
      <div className="pm-popup-content" onClick={e => e.stopPropagation()}>

        {/* Floating Close Button (Fixed) */}
        <button className="pm-close-btn floating" onClick={onCollapse}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="pm-popup-scroll">

          {/* Top Image Section (Now inside scroll) */}
          <div className="pm-image-area">
            {renderProgressBar()}
            <img src={imageToShow} alt="" className="pm-image-bg-blur" />
            <img
              src={imageToShow}
              alt="profile"
              className="pm-image-contained"
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer' }}
            />
            <button className="pm-full-view-btn" onClick={() => setLightboxOpen(true)} title="View Full Image">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>
            {images.length > 1 && (
              <>
                <button className="pm-img-nav left" onClick={handlePrev} />
                <button className="pm-img-nav right" onClick={handleNext} />
              </>
            )}
            <button className="pm-full-view-btn" onClick={() => setLightboxOpen(true)} title="View Full Image">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>
          </div>

          <div className="pm-expanded-header">
            <div className="pm-expanded-title">
              <h2>
                {user?.name ?? "Student"}
                {age && <span style={{ fontWeight: 400, opacity: 0.7 }}>, {age}</span>}
              </h2>
              {renderVerifiedBadge()}
              <p className="pm-expanded-subtitle">
                {user?.college || "University Student"}
              </p>
            </div>
            {/* Close button moved out */}
          </div>

          <div className="pm-details-list">

            {/* 1. About Section */}
            {(user?.bio || (user?.interests && user.interests.length > 0)) && (
              <div className="pm-section-card">
                <div className="pm-section-title">About Me</div>
                {user?.bio && <div className="pm-bio-text">{user.bio}</div>}

                {user?.interests && user.interests.length > 0 && (
                  <div className="pm-interests-preview" style={{ marginTop: '12px' }}>
                    {user.interests.map(int => (
                      <span key={int} className="pm-interest-tag">{int}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. The Vibe (Personality) */}
            {(user?.loveLanguage || user?.sundayStyle || user?.travelPreference || user?.communicationImportance || user?.conflictApproach) && (
              <div className="pm-section-card">
                <div className="pm-section-title">The Vibe</div>
                <div className="pm-attributes-grid">
                  {user?.loveLanguage && (
                    <div className="pm-attr-item">
                      <span className="pm-attr-label">❤️ Love Language</span>
                      <span className="pm-attr-value">{user.loveLanguage}</span>
                    </div>
                  )}
                  {user?.sundayStyle && (
                    <div className="pm-attr-item">
                      <span className="pm-attr-label">☀️ Sunday Style</span>
                      <span className="pm-attr-value">{user.sundayStyle}</span>
                    </div>
                  )}
                  {user?.travelPreference && (
                    <div className="pm-attr-item">
                      <span className="pm-attr-label">✈️ Travel</span>
                      <span className="pm-attr-value">{user.travelPreference}</span>
                    </div>
                  )}
                  {user?.communicationImportance && (
                    <div className="pm-attr-item">
                      <span className="pm-attr-label">💬 Communication</span>
                      <span className="pm-attr-value">{user.communicationImportance}</span>
                    </div>
                  )}
                  {user?.conflictApproach && (
                    <div className="pm-attr-item">
                      <span className="pm-attr-label">🤝 Conflict</span>
                      <span className="pm-attr-value">{user.conflictApproach}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Basics / Social */}
            {(user?.instagramId) && (
              <div className="pm-section-card">
                <div className="pm-section-title">Connect</div>
                <div className="pm-attributes-grid">
                  {user?.instagramId && (
                    <div className="pm-attr-item full-width">
                      <span className="pm-attr-label">Instagram</span>
                      <span className="pm-attr-value instagram">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        @{user.instagramId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {collapsedContent}
      {renderExpanded && ReactDOM.createPortal(expandedContent, document.body)}
      {lightbox}
    </>
  )
}