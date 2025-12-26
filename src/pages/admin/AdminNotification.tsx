import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function AdminNotificationPanel() {
  const [group, setGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // Fetch group notifications
  useEffect(() => {
    if (searchMode) return;
    setLoading(true);
    const fetchGroupNotifications = async () => {
      let q;
      if (group === "all" || group === "verified" || group === "female" || group === "male") {
        q = query(
          collection(db, "notifications"),
          where("userUid", "==", null),
          where("targetType", "==", group)
        );
      }
      if (q) {
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setNotifications([]);
      }
      setLoading(false);
    };
    fetchGroupNotifications();
  }, [group, searchMode]);

  // Search user notifications
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setSearchMode(true);
    let userUid = searchTerm;
    if (searchTerm.includes("@")) {
      const userSnap = await getDocs(query(collection(db, "users"), where("email", "==", searchTerm)));
      if (!userSnap.empty) userUid = userSnap.docs[0].id;
      else { setNotifications([]); setLoading(false); return; }
    }
    const q = query(collection(db, "notifications"), where("userUid", "==", userUid));
    const snap = await getDocs(q);
    setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleBackToGroup = () => {
    setSearchMode(false);
    setNotifications([]);
    setSearchTerm("");
  };

  return (
    <div className="admin-container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Notification History</h2>
      </div>

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="stack" style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Filter by Group</label>
            <select className="input" value={group} onChange={e => { setGroup(e.target.value); setSearchMode(false); }}>
              <option value="all">All Users</option>
              <option value="female">Female Users</option>
              <option value="male">Male Users</option>
              <option value="verified">Verified Users</option>
            </select>
          </div>

          <div className="stack" style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Search User</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                type="text"
                placeholder="Email or UID"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSearch}>Search</button>
            </div>
          </div>

          {searchMode && (
            <button className="btn btn-ghost" onClick={handleBackToGroup} style={{ height: 42 }}>
              Clear Search
            </button>
          )}
        </div>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        {loading ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: 'var(--admin-text-muted)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: 'var(--admin-text-muted)' }}>No notifications found.</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{n.title}</div>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                  {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : "Unknown Date"}
                </span>
              </div>
              <div style={{ color: 'var(--admin-text-muted)', fontSize: 14 }}>{n.body}</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <span className={`badge badge-${n.userUid ? 'info' : 'warning'}`}>
                  {n.userUid ? `Personal: ${n.userUid}` : `Group: ${n.targetType || 'All'}`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
