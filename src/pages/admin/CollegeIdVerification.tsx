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
    <div className="admin-modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="admin-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
        >
          &times;
        </button>

        <h3 style={{ marginTop: 0, textAlign: 'center' }}>College ID Verification</h3>
        <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>{user.name} ({user.college})</p>

        <div className="stack" style={{ gap: 24, marginTop: 24 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Front Side</div>
            <img src={user.collegeId.frontUrl} alt="Front" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--admin-border)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Back Side</div>
            <img src={user.collegeId.backUrl} alt="Back" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--admin-border)' }} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 32, gap: 12 }}>
          <button className="btn btn-primary" style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }} onClick={() => { handleVerify(user.id); onClose(); }}>
            Verify
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, color: '#dc2626' }} onClick={() => { handleReject(user.id); onClose(); }}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>College ID Verification</h2>
        {users.length > 0 && <span className="badge badge-warning">{users.length} Pending</span>}
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading pending verifications...</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            No users pending verification. All caught up! 🎉
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>College</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{u.email}</div>
                      {u.instagramId && <div style={{ fontSize: 12, color: '#3b82f6' }}>@{u.instagramId}</div>}
                    </td>
                    <td>
                      {u.college || <span className="text-muted">-</span>}
                    </td>
                    <td>
                      <span className="badge badge-warning">Pending Review</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => setModalUser(u)}>
                        Review ID
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {actionStatus && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderRadius: 6, fontSize: 13 }}>
            {actionStatus}
          </div>
        )}
      </div>

      {modalUser && <Modal user={modalUser} onClose={() => setModalUser(null)} />}
    </div>
  );
}
