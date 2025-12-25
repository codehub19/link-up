import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
// Reuse the modern styles directly
import "../../components/ProfileMiniCard.styles.css";

type UserDoc = {
  uid: string
  name?: string
  instagramId?: string
  photoUrl?: string
  photoUrls?: string[]
  bio?: string
  interests?: string[]
  college?: string
  verified?: boolean
  loveLanguage?: string
  travelPreference?: string
  sundayStyle?: string
  communicationImportance?: string
  conflictApproach?: string
  height?: string
  dob?: string
  age?: number
  collegeId?: { verified?: boolean }
}

function calculateAge(dob?: string) {
  if (!dob) return ""
  const birth = new Date(dob)
  const now = new Date()
  return Math.floor(
    (now.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)
  )
}

export default function ProfileView() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then(snap => {
      if (snap.exists()) setUser({ uid, ...snap.data() });
    });
  }, [uid]);

  const images = (user?.photoUrls?.length ? user.photoUrls : [user?.photoUrl]).filter(Boolean) as string[];
  const imageToShow = images[imgIdx] || "/placeholder.jpg";
  const age = user?.dob ? calculateAge(user.dob) : user?.age || "";

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImgIdx(prev => (prev + 1) % images.length);
  }

  const renderVerifiedBadge = () => (
    (user?.verified || user?.collegeId?.verified) ? (
      <span className="pm-verified" title="Verified Student">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
        </svg>
      </span>
    ) : null
  )

  const renderProgressBar = () => (
    <div className="pm-progress-bar">
      {images.length > 1 && images.map((_, i) => (
        <div key={i} className="pm-progress-dot">
          {i === imgIdx && <div className="pm-progress-fill" style={{ width: '100%' }} />}
          {i !== imgIdx && <div className="pm-progress-fill" style={{ width: i < imgIdx ? '100%' : '0%' }} />}
        </div>
      ))}
    </div>
  )

  if (!user) return <div />; // Loading state could be here

  return (
    <div style={{ background: '#121216', minHeight: '100vh', color: '#fff' }}>

      {/* Floating Back Button - Outside Image Area for guaranteed visibility */}
      <button className="pm-close-btn floating" onClick={() => navigate(-1)} style={{ position: 'fixed', top: 20, left: 20, right: 'auto', transform: 'rotate(180deg)', zIndex: 9999 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>

      {/* 1. Cinema Image Area */}
      <div className="pm-image-area" style={{ height: '60vh', background: '#000' }}>

        {renderProgressBar()}

        <img src={imageToShow} alt="" className="pm-image-bg-blur" />
        <img
          src={imageToShow}
          alt="profile"
          className="pm-image-contained"
          onClick={() => setLightboxOpen(true)}
          style={{ cursor: 'pointer' }}
        />

        {images.length > 1 && (
          <>
            <button className="pm-img-nav left" onClick={handlePrev} />
            <button className="pm-img-nav right" onClick={handleNext} />
          </>
        )}

        {/* Full View Toggle */}
        <button className="pm-full-view-btn" onClick={() => setLightboxOpen(true)} title="View Full Image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
      </div>

      {/* 2. Content */}
      <div className="pm-expanded-header">
        <div className="pm-expanded-title">
          <h2>
            {user.name || "Student"}
            {age && <span style={{ fontWeight: 400, opacity: 0.7 }}>, {age}</span>}
          </h2>
          {renderVerifiedBadge()}
          <p className="pm-expanded-subtitle">
            {user.college || "University Student"}
          </p>
        </div>
      </div>

      <div className="pm-details-list">
        {/* About Section */}
        {(user.bio || (user.interests && user.interests.length > 0)) && (
          <div className="pm-section-card">
            <div className="pm-section-title">About Me</div>
            {user.bio && <div className="pm-bio-text">{user.bio}</div>}
            {user.interests && user.interests.length > 0 && (
              <div className="pm-interests-preview" style={{ marginTop: '12px' }}>
                {user.interests.map(int => (
                  <span key={int} className="pm-interest-tag">{int}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* The Vibe */}
        {(user.loveLanguage || user.sundayStyle || user.travelPreference || user.communicationImportance || user.conflictApproach || user.height) && (
          <div className="pm-section-card">
            <div className="pm-section-title">The Vibe</div>
            <div className="pm-attributes-grid">
              {user.height && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">📏 Height</span>
                  <span className="pm-attr-value">{user.height}</span>
                </div>
              )}
              {user.loveLanguage && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">❤️ Love Language</span>
                  <span className="pm-attr-value">{user.loveLanguage}</span>
                </div>
              )}
              {user.sundayStyle && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">☀️ Sunday Style</span>
                  <span className="pm-attr-value">{user.sundayStyle}</span>
                </div>
              )}
              {user.travelPreference && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">✈️ Travel</span>
                  <span className="pm-attr-value">{user.travelPreference}</span>
                </div>
              )}
              {user.communicationImportance && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">💬 Communication</span>
                  <span className="pm-attr-value">{user.communicationImportance}</span>
                </div>
              )}
              {user.conflictApproach && (
                <div className="pm-attr-item">
                  <span className="pm-attr-label">🤝 Conflict</span>
                  <span className="pm-attr-value">{user.conflictApproach}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connect */}
        {user.instagramId && (
          <div className="pm-section-card">
            <div className="pm-section-title">Connect</div>
            <div className="pm-attributes-grid">
              <div className="pm-attr-item full-width">
                <span className="pm-attr-label">Instagram</span>
                <span className="pm-attr-value instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  @{user.instagramId.replace('@', '')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className={`pm-lightbox ${lightboxOpen ? 'open' : ''}`} onClick={() => setLightboxOpen(false)}>
          <button className="pm-lightbox-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img src={imageToShow} alt="Full view" onClick={e => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}