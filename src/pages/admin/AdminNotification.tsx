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
      const q = query(
        collection(db, "notifications"),
        where("userUid", "==", null),
        where("targetType", "==", group)
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchGroupNotifications();
  }, [group, searchMode]);

  // Search user notifications
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setSearchMode(true);
    // Find user UID by email if needed, or use UID directly
    let userUid = searchTerm;
    // If searching by email, fetch UID from users collection
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
    <div>
      <h2>Admin Notifications</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Group:&nbsp;
          <select value={group} onChange={e => { setGroup(e.target.value); setSearchMode(false); }}>
            <option value="all">All Users</option>
            <option value="female">Female Users</option>
            <option value="male">Male Users</option>
            <option value="verified">Verified Users</option>
          </select>
        </label>
        <input
          type="text"
          placeholder="Search user by email or UID"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginLeft: 16, marginRight: 8 }}
        />
        <button onClick={handleSearch}>Search</button>
        {searchMode && (
          <button onClick={handleBackToGroup} style={{ marginLeft: 8 }}>Back to Group View</button>
        )}
      </div>
      {loading ? <div>Loading...</div> : notifications.length === 0 ? (
        <div>No notifications found.</div>
      ) : (
        <ul>
          {notifications.map(n => (
            <li key={n.id} style={{
              margin: "18px 0",
              background: "#232a38",
              color: "#fff",
              borderRadius: 12,
              padding: "12px 16px",
              boxShadow: "0 2px 8px #0002",
              position: "relative"
            }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{n.title}</div>
              <div style={{ marginTop: 6 }}>{n.body}</div>
              <div style={{ fontSize: 13, color: "#90caf9", marginTop: 6 }}>
                {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ""}
              </div>
              <div style={{ fontSize: 13, color: "#fbc02d", marginTop: 6 }}>
                {n.userUid === null
                  ? `Group: ${n.targetType || "all"}`
                  : `Personal to UID: ${n.userUid}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}