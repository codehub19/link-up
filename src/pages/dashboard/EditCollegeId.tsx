import React, { useState } from "react";
import { uploadCollegeId } from "../../firebase";
import { useAuth } from "../../state/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import { compressImage } from "../../utils/compressImage";
import './EditCollegeId.styles.css';

export default function EditCollegeId() {
  const { user, profile, refreshProfile } = useAuth();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { collegeId } = profile || ({} as any);

  // Determine upload eligibility
  const canUpload =
    !collegeId ||
    (!collegeId.frontUrl && !collegeId.backUrl) ||
    (collegeId.verified === false && collegeId.rejected === true);

  const handleFrontChange = async (file: File | null) => {
    if (file) {
      const compressed = await compressImage(file);
      setFront(compressed);
      setFrontPreview(URL.createObjectURL(compressed));
    } else {
      setFront(null);
      setFrontPreview(null);
    }
  };

  const handleBackChange = async (file: File | null) => {
    if (file) {
      const compressed = await compressImage(file);
      setBack(compressed);
      setBackPreview(URL.createObjectURL(compressed));
    } else {
      setBack(null);
      setBackPreview(null);
    }
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

  const UploadIcon = () => (
    <svg className="id-upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );

  return (
    <div className="college-id-card">
      <h3 className="college-id-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Verify College ID
      </h3>

      {canUpload ? (
        <>
          <div className="college-id-grid">
            {/* Front Upload */}
            <label className={`id-upload-box ${frontPreview ? 'has-image' : ''}`}>
              <input
                className="id-file-input"
                type="file"
                accept="image/*"
                onChange={e => handleFrontChange(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              {frontPreview ? (
                <img src={frontPreview} alt="Front Preview" className="id-preview-img" />
              ) : (
                <div className="id-upload-content">
                  <UploadIcon />
                  <span className="id-upload-label">Front ID</span>
                  <span className="id-upload-sub">Tap to upload</span>
                </div>
              )}
            </label>

            {/* Back Upload */}
            <label className={`id-upload-box ${backPreview ? 'has-image' : ''}`}>
              <input
                className="id-file-input"
                type="file"
                accept="image/*"
                onChange={e => handleBackChange(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              {backPreview ? (
                <img src={backPreview} alt="Back Preview" className="id-preview-img" />
              ) : (
                <div className="id-upload-content">
                  <UploadIcon />
                  <span className="id-upload-label">Back ID</span>
                  <span className="id-upload-sub">Tap to upload</span>
                </div>
              )}
            </label>
          </div>

          {error && <div style={{ color: "#f43f5e", fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

          <button className="id-submit-btn" onClick={handleUpload} disabled={uploading}>
            {uploading ? <LoadingSpinner color="#fff" size={20} /> : "Upload for Verification"}
          </button>
        </>
      ) : (
        <div className="id-status-box">
          <div style={{ fontSize: '1.5rem' }}>
            {collegeId?.verified ? '✅' : '⏳'}
          </div>
          <div className="id-status-text">
            {collegeId?.verified ? (
              <>
                <strong>Verified Student</strong>
                <span className="id-status-sub">Your college status is active.</span>
              </>
            ) : (
              <>
                <strong>Pending Verification</strong>
                <span className="id-status-sub">We are reviewing your ID. This takes ~24h.</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}