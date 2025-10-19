import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useAuth } from "../../state/AuthContext";
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchNotifications = async () => {
      setLoading(true);
      const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const q = query(
  collection(db, "notifications"),
  where("createdAt", ">=", sevenDaysAgo),
  where("userUid", "in", [user.uid, null])
);
      
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchNotifications();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || notifications.length === 0) return;
    notifications.forEach(n => {
      if (!n.seen && n.userUid === user.uid) {
        updateDoc(doc(db, "notifications", n.id), { seen: true }).catch(() => {});
      }
    });
  }, [notifications, user?.uid]);

  return (
    <div>
      <h2 style={{ marginBottom: 18 }}>Notifications</h2>
      {loading ? <div>Loading...</div> : notifications.length === 0 ? (
        <div>No notifications in the last 7 days.</div>
      ) : (
        <ul>
          {notifications.map(n => (
            <li key={n.id} style={{
              margin: "18px 0", background: "#232a38", color: "#fff",
              borderRadius: 12, padding: "12px 16px", boxShadow: "0 2px 8px #0002"
            }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{n.title}</div>
              <div style={{ marginTop: 6 }}>{n.body}</div>
              <div style={{ fontSize: 13, color: "#90caf9", marginTop: 6 }}>
                {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}