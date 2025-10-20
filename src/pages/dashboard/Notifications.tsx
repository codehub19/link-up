import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useAuth } from "../../state/AuthContext";
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore";
import LoadingHeart from "../../components/LoadingHeart";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt?: { seconds: number };
  userUid?: string | null;
  seen?: boolean;
  [key: string]: any;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchNotifications = async () => {
      setLoading(true);

      const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      // Fetch personal and global notifications
      const qPersonal = query(
        collection(db, "notifications"),
        where("createdAt", ">=", sevenDaysAgo),
        where("userUid", "==", user.uid)
      );
      const qGlobal = query(
        collection(db, "notifications"),
        where("createdAt", ">=", sevenDaysAgo),
        where("userUid", "==", null)
      );

      // Build the notificationsData array explicitly typed
      const snapPersonal = await getDocs(qPersonal);
      const snapGlobal = await getDocs(qGlobal);

      const notificationsData: Notification[] = [
        ...snapPersonal.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)),
        ...snapGlobal.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
      ];

      notificationsData.sort((a, b) => {
        const aTime = (a && a.createdAt && typeof a.createdAt.seconds === "number")
          ? a.createdAt.seconds
          : 0;
        const bTime = (b && b.createdAt && typeof b.createdAt.seconds === "number")
          ? b.createdAt.seconds
          : 0;
        return bTime - aTime;
      });

      setNotifications(notificationsData);
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
      {loading ? (
        <div className="loading-page-wrapper">
              <LoadingHeart size={72} />
            </div> 
      ) : notifications.length === 0 ? (
        <div>No notifications in the last 7 days.</div>
      ) : notifications.length === 0 ? (
        <div>No notifications in the last 7 days.</div>
      ) : (
        <ul style={{ padding: 0, listStyle: "none", marginRight: "2%", marginLeft: "2%" }}>
          {notifications.map(n => (
            <li key={n.id} style={{
              margin: "18px 0",
              background: "#232a38",
              color: "#fff",
              borderRadius: 12,
              padding: "12px 16px",
              boxShadow: "0 2px 8px #0002"
            }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{n.title}</div>
              <div style={{ marginTop: 6 }}>{n.body}</div>
              <div style={{ fontSize: 13, color: "#90caf9", marginTop: 6 }}>
                {n.createdAt && typeof n.createdAt.seconds === "number"
                  ? new Date(n.createdAt.seconds * 1000).toLocaleString()
                  : ""}
              </div>
              {/* <div style={{ fontSize: 12, color: "#fbc02d", marginTop: 4 }}>
                {n.userUid === null
                  ? `Group notification`
                  : `Personal notification`}
              </div> */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}