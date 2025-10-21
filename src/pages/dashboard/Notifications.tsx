import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useAuth } from "../../state/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import LoadingHeart from "../../components/LoadingHeart";
import Navbar from "../../components/Navbar";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt?: { seconds: number };
  userUid?: string | null;
  seen?: boolean;
  targetType?: string;
  [key: string]: any;
};

function formatDate(secs?: number) {
  if (!secs) return "";
  const d = new Date(secs * 1000);
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchNotifications = async () => {
      setLoading(true);

      const sevenDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

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
        ...snapPersonal.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Notification)),
        ...snapGlobal.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Notification)),
      ];

      notificationsData.sort((a, b) => {
        const aTime =
          a && a.createdAt && typeof a.createdAt.seconds === "number"
            ? a.createdAt.seconds
            : 0;
        const bTime =
          b && b.createdAt && typeof b.createdAt.seconds === "number"
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
    notifications.forEach((n) => {
      if (!n.seen && n.userUid === user.uid) {
        updateDoc(doc(db, "notifications", n.id), { seen: true }).catch(() => {});
      }
    });
  }, [notifications, user?.uid]);

  // Group by date for better readability
  const grouped = notifications.reduce((acc, n) => {
    const dateStr = formatDate(n.createdAt?.seconds).slice(0, 10); // YYYY-MM-DD
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <>
      <Navbar />
    <div className="container" style={{ maxWidth: "70%", margin: "40px auto 0 auto" }}>
      <h2 style={{ marginBottom: 18 }}>Notifications</h2>
      {loading ? (
        <div className="loading-page-wrapper">
          <LoadingHeart size={72} />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ color: "#888", marginTop: 32, textAlign: "center" }}>
          <span style={{ fontSize: 18 }}>No notifications in the last 7 days.</span>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([date, notifs]) => (
            <div key={date} style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#ff5d7c",
                  marginBottom: 10,
                  marginTop: 18,
                }}
              >
                {date}
              </div>
              <ul
                style={{
                  padding: 0,
                  listStyle: "none",
                  marginRight: 0,
                  marginLeft: 0,
                }}
              >
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    style={{
                      margin: "18px 0",
                      background: n.seen ? "#232a38" : "#2d3748",
                      color: "#fff",
                      borderRadius: 12,
                      padding: "12px 16px",
                      boxShadow: "0 2px 8px #0002",
                      position: "relative",
                      opacity: n.seen ? 0.85 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 17 }}>
                      {n.title}
                      {n.userUid === null && (
                        <span
                          style={{
                            fontSize: 12,
                            marginLeft: 8,
                            color: "#90caf9",
                            background: "#232a38",
                            borderRadius: 4,
                            padding: "2px 6px",
                          }}
                        >
                          Group
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6 }}>{n.body}</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#90caf9",
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        {n.createdAt && typeof n.createdAt.seconds === "number"
                          ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                      {!n.seen && (
                        <span
                          style={{
                            marginLeft: 10,
                            color: "#fff",
                            background: "#ff5d7c",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 12,
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
    </>

  );
}