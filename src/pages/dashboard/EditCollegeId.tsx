import React, { useState } from "react";
import { uploadCollegeId } from "../../firebase";
import { useAuth } from "../../state/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function EditCollegeId() {
  const { user, profile, refreshProfile } = useAuth();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { collegeId } = profile || {};

  // Determine upload eligibility
  const canUpload =
    !collegeId ||
    (!collegeId.frontUrl && !collegeId.backUrl) ||
    (collegeId.verified === false && collegeId.rejected === true);

  const handleFrontChange = (file: File | null) => {
    setFront(file);
    setFrontPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleBackChange = (file: File | null) => {
    setBack(file);
    setBackPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleUpload = async () => {
    setError(null);
    if (!user || !front || !back) {
      setError("Please select both front and back images.");
      return;
    }
    setUploading(true);
    try {
      await uploadCollegeId(user.uid, front, back);
      await refreshProfile?.();
      setFront(null);
      setBack(null);
      setFrontPreview(null);
      setBackPreview(null);
    } catch (e: any) {
      setError(e.message || "Failed to upload.");
    }
    setUploading(false);
  };

  return (
    <div>
      <h3 style={{ fontWeight: 600, marginBottom: 16 }}>
        Verify your profile with College ID card
      </h3>
      {canUpload ? (
        <>
          <div className="upload-row">
            <label className="field" style={{ marginBottom: 8, fontWeight: 500 }}>
              Front Image:
              <input
                className="field-input"
                type="file"
                accept="image/*"
                onChange={e => handleFrontChange(e.target.files?.[0] || null)}
                disabled={uploading}
                style={{ marginTop: 8 }}
              />
              {frontPreview && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={frontPreview}
                    alt="Front preview"
                    style={{
                      maxWidth: 120,
                      maxHeight: 80,
                      borderRadius: 8,
                      boxShadow: "0 2px 8px #0003",
                      border: "1px solid #2196f3",
                    }}
                  />
                </div>
              )}
            </label>
          </div>
          <div className="upload-row">
            <label className="field" style={{ marginBottom: 12, fontWeight: 500 }}>
              Back Image:
              <input
                className="field-input"
                type="file"
                accept="image/*"
                onChange={e => handleBackChange(e.target.files?.[0] || null)}
                disabled={uploading}
                style={{ marginTop: 8 }}
              />
              {backPreview && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={backPreview}
                    alt="Back preview"
                    style={{
                      maxWidth: 120,
                      maxHeight: 80,
                      borderRadius: 8,
                      boxShadow: "0 2px 8px #0003",
                      border: "1px solid #2196f3",
                    }}
                  />
                </div>
              )}
            </label>
          </div>
          <button
            className="btn-gradient"
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: "100%",
              marginTop: 5,
              fontWeight: 600,
              fontSize: 16,
              padding: "12px 0",
              letterSpacing: 0.2,
              borderRadius: 10,
            }}
          >
            {uploading ? <LoadingSpinner /> : "Upload College ID"}
          </button>
          {error && (
            <div style={{ color: "#f44336", marginTop: 10, fontWeight: 500 }}>
              {error}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            marginBottom: 18,
            color: "#bdbdbd",
            fontWeight: 500,
            background: "rgba(30,34,46,0.44)",
            borderRadius: 16,
            padding: "12px 18px",
            letterSpacing: 0.2,
            boxShadow: "0 2px 12px #0002",
            fontSize: 16,
          }}
        >
          {collegeId?.verified
            ? (
                <span>
                  <span role="img" aria-label="verified">✅</span> Your College ID has been verified.<br />
                  <span style={{ fontSize: 13, color: "#b8e9c2" }}>
                    You cannot update or view images after verification.
                  </span>
                </span>
              )
            : (
                collegeId?.frontUrl && collegeId?.backUrl && collegeId?.verified === false
                  ? <span>
                      <span role="img" aria-label="pending">⏳</span> Your College ID is pending verification.<br />
                      <span style={{ fontSize: 13, color: "#ffe082" }}>
                        You cannot update or view images until verification is complete.
                      </span>
                    </span>
                  : <span>
                      <span role="img" aria-label="not-uploaded">🪪</span> No college ID uploaded yet.
                    </span>
              )
          }
        </div>
      )}
    </div>
  );
}