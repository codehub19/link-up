import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "../../components/Navbar";
import "./dashboard.css";

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
}

export default function ProfileView() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then(snap => {
      if (snap.exists()) setUser({ uid, ...snap.data() });
    });
  }, [uid]);

  const images = (user?.photoUrls?.length ? user.photoUrls : [user?.photoUrl]).filter(Boolean);

  return (
    <>
      <Navbar />
      <div className="container edit-profile-container">
        <button className="edit-profile-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="profile-view-hero">
          <div className="profile-view-photos-area">
            <div className="profile-view-photos-grid">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  className={`profile-view-photo-slot primary`}
                  onClick={() => setPopupUrl(url!)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={url!} alt={`Photo ${idx + 1}`} className="profile-view-img" />
                </div>
              ))}
            </div>
          </div>
          <div className="profile-view-user-details">
            <div className="profile-view-main-row">
              <span className="profile-view-main-name">{user?.name || 'Name hidden'}</span>
            </div>
            <div className="profile-view-main-instagram">
              {user?.instagramId ? 
                <span>@{user.instagramId.replace(/^@/, '')}</span> : 
                null}
            </div>
          </div>
        </div>

        <div className="profile-view-form-section">
          <div className="field">
            <div className="field-label">ABOUT ME</div>
            <div className={user?.bio ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.bio || "No bio set."}
            </div>
          </div>
          <div className="field">
            <div className="field-label">INTERESTS</div>
            <div className="interests-wrap">
              {(user?.interests ?? []).length > 0 ?
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {user?.interests?.map((i) => <span key={i} className="pm-interest-pill">{i}</span>)}
                </div>
              : <span className="profile-info-value profile-info-value-empty">No interests set.</span>}
            </div>
          </div>
          <div className="field">
            <div className="field-label">HEIGHT</div>
            <div className={user?.height ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.height || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">COLLEGE</div>
            <div className={user?.college ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.college || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">LOVE LANGUAGE</div>
            <div className={user?.loveLanguage ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.loveLanguage || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">TRAVEL PREFERENCE</div>
            <div className={user?.travelPreference ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.travelPreference || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">IDEAL SUNDAY</div>
            <div className={user?.sundayStyle ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.sundayStyle || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">COMMUNICATION IMPORTANCE</div>
            <div className={user?.communicationImportance ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.communicationImportance || "Not specified"}
            </div>
          </div>
          <div className="field">
            <div className="field-label">CONFLICT APPROACH</div>
            <div className={user?.conflictApproach ? "profile-info-value" : "profile-info-value profile-info-value-empty"}>
              {user?.conflictApproach || "Not specified"}
            </div>
          </div>
        </div>
      </div>
      {popupUrl && (
        <div
          className="profile-view-photo-popup"
          onClick={() => setPopupUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <img
            src={popupUrl}
            alt="Profile"
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              borderRadius: 24,
              boxShadow: "0 6px 32px rgba(0,0,0,0.34)",
              background: "#222",
              objectFit: "contain",
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}