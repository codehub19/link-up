import React, { useEffect, useState } from "react";
import { db, verifyCollegeId } from "../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../state/AuthContext";
import { AdminHeader } from "./AdminHome";

export default function CollegeIdVerification() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(db, "users"));
        const arr: any[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.collegeId && (!data.collegeId.verified || data.collegeId.verified === false)) {
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

  

  // Click to verify
  const handleVerify = async (uid: string) => {
    setActionStatus(null);
    try {
      await verifyCollegeId(uid);
      setActionStatus("Verified " + uid);
    } catch (e: any) {
      setActionStatus("Failed to verify: " + (e.message || ""));
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <AdminHeader current="college-id-verification" />
      <h2>College ID Verification</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <>
          {users.length === 0 ? (
            <p>No users pending verification.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Front Image</th>
                  <th>Back Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div>
                        <div><b>{u.name}</b></div>
                        <div>{u.email}</div>
                        <div>UID: {u.uid}</div>
                      </div>
                    </td>
                    <td>
                      {u.collegeId?.frontUrl ? (
                        <a href={u.collegeId.frontUrl} target="_blank" rel="noopener noreferrer">
                          <img src={u.collegeId.frontUrl} alt="Front" style={{ maxWidth: 150 }} />
                        </a>
                      ) : (
                        "No front image"
                      )}
                    </td>
                    <td>
                      {u.collegeId?.backUrl ? (
                        <a href={u.collegeId.backUrl} target="_blank" rel="noopener noreferrer">
                          <img src={u.collegeId.backUrl} alt="Back" style={{ maxWidth: 150 }} />
                        </a>
                      ) : (
                        "No back image"
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleVerify(u.uid)}
                        style={{ padding: "0.5em 1em", background: "#4caf50", color: "#fff", border: "none", borderRadius: 4 }}
                      >
                        Mark as Verified
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {actionStatus && <div style={{ marginTop: 16 }}>{actionStatus}</div>}
        </>
      )}
    </div>
  );
}