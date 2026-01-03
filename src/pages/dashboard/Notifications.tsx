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
import HomeBackground from "../../components/home/HomeBackground";
import "./Notifications.styles.css";
import "./dashboard.css"; // Ensure global dash styles

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

// Helper to format time relative or absolute
function formatTime(secs?: number) {
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper for date headers (Today, Yesterday, etc.)
function getDateHeader(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  });
}

function formatDateKey(secs?: number) {
  if (!secs) return "";
  return new Date(secs * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
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
      const [snapPersonal, snapGlobal] = await Promise.all([
        getDocs(qPersonal),
        getDocs(qGlobal)
      ]);

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

      // Filter out notifications before user joined
      // Use user.metadata.creationTime if profile.createdAt is not available or reliable
      const joinTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;

      const filtered = notificationsData.filter(n => {
        if (!n.createdAt?.seconds) return true;
        // Buffer of 60 seconds to allow for slight server/client clock diff on creation
        const notifTime = n.createdAt.seconds * 1000;
        return notifTime >= (joinTime - 60000);
      });

      filtered.sort((a, b) => {
        const aTime = a?.createdAt?.seconds || 0;
        const bTime = b?.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setNotifications(filtered);
      setLoading(false);
    };
    fetchNotifications();
  }, [user?.uid]);

  // Mark as seen logic
  useEffect(() => {
    if (!user?.uid || notifications.length === 0) return;
    notifications.forEach((n) => {
      if (!n.seen && n.userUid === user.uid) {
        updateDoc(doc(db, "notifications", n.id), { seen: true }).catch(() => { });
      }
    });
  }, [notifications, user?.uid]);

  // Group by date
  const grouped = notifications.reduce((acc, n) => {
    const dateStr = formatDateKey(n.createdAt?.seconds);
    if (!dateStr) return acc;
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        <div className="notifications-hero">
          <h1 className="notifications-title text-gradient">Notifications</h1>
          <p className="notifications-subtitle">Stay updated with your latest matches and activity.</p>
        </div>

        {loading ? (
          <div className="loading-wrapper">
            <LoadingHeart size={64} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-notifications">
            <p>No notifications in the last 7 days.</p>
          </div>
        ) : (
          <div>
            {sortedDates.map((date) => (
              <div key={date}>
                <div className="notification-group-title">
                  {getDateHeader(date)}
                </div>
                <ul className="notification-list">
                  {grouped[date].map((n) => (
                    <li key={n.id} className={`notification-card ${!n.seen ? 'unread' : ''}`}>
                      <div className="notif-header">
                        <div className="notif-title">
                          {n.title}
                          {n.userUid === null && (
                            <span className="badge-group">Group</span>
                          )}
                        </div>
                        {!n.seen && (
                          <span className="badge-new">New</span>
                        )}
                      </div>

                      <div className="notif-body">
                        {n.body}
                      </div>

                      <div className="notif-meta">
                        {formatTime(n.createdAt?.seconds)}
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