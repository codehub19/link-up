import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useAuth } from "../../state/AuthContext";

export default function CollegeIdVerification() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<any | null>(null);


  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(db, "users"));
        const arr: any[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (
            data.collegeId &&
            data.collegeId.frontUrl &&
            data.collegeId.backUrl &&
            (!data.collegeId.verified || data.collegeId.verified === false)
            // Only show pending verifications (not verified or rejected)
            && !data.collegeId.rejected
          ) {
            arr.push({ ...data, id: doc.id });
          }
        });
        setUsers(arr);
      } catch (e: any) {
        setError(e.message || "Failed to fetch users.");
      }
      setLoading(false);
    }
    fetchUsers();
  }, [actionStatus]);
  
  // Only show if admin
  if (!profile?.isAdmin) {
    return <div>You do not have admin access.</div>;
  }

  

  const handleVerify = async (uid: string) => {
    setActionStatus(null);
    try {
      await setDoc(doc(db, "users", uid), {
        collegeId: {
          verified: true,
          rejected: false
        }
      }, { merge: true });
      setActionStatus("Verified " + uid);
    } catch (e: any) {
      setActionStatus("Failed to verify: " + (e.message || ""));
    }
  };

  const handleReject = async (uid: string) => {
    setActionStatus(null);
    try {
      await setDoc(doc(db, "users", uid), {
        collegeId: {
          verified: false,
          rejected: true
        }
      }, { merge: true });
      setActionStatus("Rejected " + uid);
    } catch (e: any) {
      setActionStatus("Failed to reject: " + (e.message || ""));
    }
  };

  // Modal popup for viewing College ID images
  // ...imports and verification logic as before...

// Responsive Modal popup for viewing College ID images
const Modal = ({ user, onClose }: { user: any; onClose: () => void }) => (
  <div className="cid-modal-overlay" onClick={onClose}>
    <div className="cid-modal-content setup-card setup-card-glass" onClick={e => e.stopPropagation()}>
      <button className="cid-modal-close-btn" onClick={onClose} aria-label="Close">&times;</button>
      <div style={{ textAlign: "center" }}>
        <h4 style={{ marginBottom: 12, fontSize: "1.25rem", fontWeight: 600 }}>
          College ID for {user.name || user.email || user.id}
        </h4>
        <div style={{ marginBottom: 10 }}>
          <b>Front:</b><br/>
          <img src={user.collegeId.frontUrl} alt="Front"
            style={{
              width: "100%",
              maxWidth: 340,
              maxHeight: "40vh",
              borderRadius: 10,
              boxShadow: "0 2px 8px #0006",
              objectFit: "contain"
            }} />
        </div>
        <div>
          <b>Back:</b><br/>
          <img src={user.collegeId.backUrl} alt="Back"
            style={{
              width: "100%",
              maxWidth: 340,
              maxHeight: "40vh",
              borderRadius: 10,
              boxShadow: "0 2px 8px #0006",
              objectFit: "contain"
            }} />
        </div>
      </div>
    </div>
    <style>
      {`
      .cid-modal-overlay {
        position: fixed;
        z-index: 1000;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw; height: 100vh;
        background: rgba(20, 20, 30, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cid-modal-content {
        position: relative;
        max-width: 420px;
        width: 96vw;
        max-height: 92vh;
        overflow-y: auto;
        border-radius: 18px;
        box-shadow: 0 8px 40px #000a;
        padding: 2rem 1rem 1.5rem 1rem;
        background: rgba(30, 34, 46, 0.98);
        transition: max-width 0.2s;
      }
      @media (max-width: 600px) {
        .cid-modal-content {
          max-width: 96vw;
          padding: 1.2rem 0.5rem 1rem 0.5rem;
        }
        .cid-modal-close-btn {
          top: 8px;
          right: 8px;
          font-size: 1.6rem;
        }
      }
      .cid-modal-close-btn {
        position: absolute;
        top: 12px;
        right: 18px;
        font-size: 2rem;
        background: none;
        border: none;
        color: #fff;
        opacity: 0.7;
        cursor: pointer;
        transition: opacity 0.2s;
        z-index: 10;
      }
      .cid-modal-close-btn:hover { opacity: 1; }
      `}
    </style>
  </div>
);

// ...rest of your admin page as before...
  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontWeight: 600, marginBottom: 18, fontSize: "2rem" }}>College ID Verification (Admin)</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <>
          {users.length === 0 ? (
            <p>No users pending verification.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(30,34,46,0.96)", borderRadius: 20, boxShadow: "0 2px 24px #0002" }}>
              <thead>
                <tr style={{ background: "#222b", color: "#fff" }}>
                  <th style={{ padding: 12, borderRadius: 10 }}>User</th>
                  <th style={{ padding: 12, borderRadius: 10 }}>College ID</th>
                  <th style={{ padding: 12, borderRadius: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #333a" }}>
                    <td style={{ padding: 14 }}>
                     <div>
  <div><b>{u.name}</b></div>
  <div>{u.email}</div>
  <div style={{ fontSize: 13, color: "#90CAF9" }}>UID: {u.id}</div>
  {u.college && (
    <div style={{ fontSize: 14, color: "#2196f3", marginTop: 4 }}>
      <b>College:</b> {u.college}
    </div>
  )}
  {u.dob && (
    <div style={{ fontSize: 14, color: "#90caf9" }}>
      <b>DOB:</b> {u.dob}
    </div>
  )}
  {u.instagramId && (
    <div style={{ fontSize: 14, color: "#90caf9" }}>
      <b>Instagram:</b> @{u.instagramId}
    </div>
  )}
  {/* Add more profile fields as needed */}
</div>
                    </td>
                    <td style={{ padding: 14 }}>
                      <button
                        className="btn-gradient"
                        style={{ padding: "8px 20px", borderRadius: 8, fontWeight: 500, fontSize: 15 }}
                        onClick={() => setModalUser(u)}
                      >
                        View College ID
                      </button>
                    </td>
                    <td style={{ padding: 14 }}>
                      <button
                        className="btn-gradient"
                        style={{ marginRight: 12, padding: "8px 24px", borderRadius: 8, fontWeight: 500, fontSize: 15, background: "#4caf50", color: "#fff" }}
                        onClick={() => handleVerify(u.id)}
                      >
                        Mark as Verified
                      </button>
                      <button
                        className="btn-gradient"
                        style={{
                          padding: "8px 24px",
                          borderRadius: 8,
                          fontWeight: 500,
                          fontSize: 15,
                          background: "#f44336",
                          color: "#fff"
                        }}
                        onClick={() => handleReject(u.id)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {actionStatus && <div style={{ marginTop: 16, fontWeight: 500, color: "#2196f3" }}>{actionStatus}</div>}
        </>
      )}
      {modalUser && (
        <Modal user={modalUser} onClose={() => setModalUser(null)} />
      )}
    </div>
  );
}