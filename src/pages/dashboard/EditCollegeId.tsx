import React, { useState } from "react";
import { uploadCollegeId } from "../../firebase";
import { useAuth } from "../../state/AuthContext";

export default function EditCollegeId() {
  const { user, profile, refreshProfile } = useAuth();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e: any) {
      setError(e.message || "Failed to upload.");
    }
    setUploading(false);
  };

  const { collegeId } = profile || {};

  return (
    <div>
      <h3>Verify your profile with College ID card</h3>
      <div>
        <label>
          Front Image: <input type="file" accept="image/*" onChange={e => setFront(e.target.files?.[0] || null)} />
        </label>
      </div>
      <div>
        <label>
          Back Image: <input type="file" accept="image/*" onChange={e => setBack(e.target.files?.[0] || null)} />
        </label>
      </div>
      <br />
      <button className="btn-gradient" onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload College ID"}
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {collegeId?.frontUrl && (
        <div>
          <h4>Current College ID</h4>
          <img alt="Front" src={collegeId.frontUrl} style={{ maxWidth: 200, marginRight: 8 }} />
          <img alt="Back" src={collegeId.backUrl} style={{ maxWidth: 200 }} />
          <div>
            Status: {collegeId.verified ? "Verified ✅" : "Pending verification ⏳"}
          </div>
        </div>
      )}
    </div>
  );
}