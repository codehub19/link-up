import React, { useState } from "react";

type ProfileMatchCardProps = {
  name: string;
  instagramId?: string;
  college?: string;
  photoUrl?: string;
  bio?: string;
  interests?: string[];
  collegeId?: { verified?: boolean };
};

export default function ProfileMatchCard({
  name,
  instagramId,
  college,
  photoUrl,
  bio,
  interests = [],
  collegeId = { verified: false },
}: ProfileMatchCardProps) {
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <>
      <div className="profile-match-card">
        <div className="profile-match-row">
          <div
            className="profile-match-photo"
            onClick={() => setShowPhoto(true)}
            style={{
              cursor: "pointer",
              background: "#181821",
              borderRadius: 16,
              width: 56,
              height: 56,
              overflow: "hidden",
              marginRight: 16,
              flexShrink: 0,
            }}
            title="Click to enlarge"
          >
            <img
              src={photoUrl || "/avatar-male.png"}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 16,
                display: "block",
              }}
            />
          </div>
          <div className="profile-match-info">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="profile-match-name">{name}</span>
              {collegeId?.verified && (
               <span title="Verified" style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <defs>
                    <linearGradient id="insta-gradient" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f9ce34"/>
                      <stop offset="0.5" stopColor="#ee2a7b"/>
                      <stop offset="1" stopColor="#6228d7"/>
                    </linearGradient>
                  </defs>
                  <circle cx="11" cy="11" r="10" fill="url(#insta-gradient)" />
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
            <div className="profile-match-social muted">
              {instagramId && (
                <span>
                  @{instagramId}
                  {college ? " • " : ""}
                </span>
              )}
              {college && <span>{college}</span>}
            </div>
            {bio && (
              <div className="profile-match-bio" style={{ marginTop: 6 }}>
                {bio}
              </div>
            )}
            {interests && interests.length > 0 && (
              <div className="profile-match-tags" style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {interests.map((tag) => (
                  <span className="profile-match-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Popup for enlarged photo */}
      {showPhoto && (
        <div
          className="profile-match-popup"
          onClick={() => setShowPhoto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99,
          }}
        >
          <img
            src={photoUrl || "/avatar-male.png"}
            alt={name}
            style={{
              maxWidth: "92vw",
              maxHeight: "85vh",
              borderRadius: 16,
              boxShadow: "0 4px 32px rgba(0,0,0,0.34)",
              background: "#222",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}