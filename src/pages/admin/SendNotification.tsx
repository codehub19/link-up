import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useAuth } from "../../state/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function SendNotificationAdmin() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [specificUser, setSpecificUser] = useState(""); // For specific user notifications
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const functions = getFunctions(undefined, "asia-south2");
  const sendPushNotification = httpsCallable(functions, "sendPushNotification");

  if (!profile?.isAdmin) return <div>Admin access only.</div>;

  const handleSend = async () => {
    setSending(true);
    setStatus("");
    let userUids: string[] = [];
    let targetType = target;
    let userUid = null;

    if (target === "all") {
      const snap = await getDocs(collection(db, "users"));
      userUids = snap.docs.map(doc => doc.id);
      targetType = "all";
      userUid = null;
    } else if (target === "verified") {
      const snap = await getDocs(query(collection(db, "users"), where("collegeId.verified", "==", true)));
      userUids = snap.docs.map(doc => doc.id);
      targetType = "verified";
      userUid = null;
    } else if (target === "female") {
      const snap = await getDocs(query(collection(db, "users"), where("gender", "==", "female")));
      userUids = snap.docs.map(doc => doc.id);
      targetType = "female";
      userUid = null;
    } else if (target === "male") {
      const snap = await getDocs(query(collection(db, "users"), where("gender", "==", "male")));
      userUids = snap.docs.map(doc => doc.id);
      targetType = "male";
      userUid = null;
    } else if (target === "specific") {
      let uid = specificUser;
      if (specificUser.includes("@")) {
        const userSnap = await getDocs(query(collection(db, "users"), where("email", "==", specificUser)));
        if (!userSnap.empty) uid = userSnap.docs[0].id;
        else {
          setStatus("User not found");
          setSending(false);
          return;
        }
      }
      userUids = [uid];
      targetType = "personal";
      userUid = uid;
    }

    // Add notification to Firestore
    await addDoc(collection(db, "notifications"), {
      title,
      body,
      userUid: userUid === "" ? null : userUid, // Ensure null for group notifications
      createdAt: Timestamp.now(), // Use Firestore Timestamp
      targetType
    });

    // Push notification
    try {
      await sendPushNotification({ userUids, title, body });
      setStatus("Notification sent!");
    } catch (err) {
      setStatus("Failed to send push notification");
      console.error(err);
    }
    setSending(false);
    setTitle("");
    setBody("");
    setSpecificUser("");
  };

  return (
    <div className="admin-container">
      <div className="row" style={{ alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Send Notification</h2>
      </div>

      <div className="admin-card" style={{ maxWidth: 600 }}>
        {status && (
          <div className={`alert alert-${status.includes('sent') ? 'success' : 'error'}`} style={{ marginBottom: 20 }}>
            {status}
          </div>
        )}

        <form className="stack" style={{ gap: 16 }} onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <div className="stack">
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification Title" required className="input" />
          </div>

          <div className="stack">
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Message Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Notification Body" required className="input" rows={4} />
          </div>

          <div className="stack">
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Target Audience</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className="input">
              <option value="all">All Users</option>
              <option value="verified">Verified Users Only</option>
              <option value="female">Female Users</option>
              <option value="male">Male Users</option>
              <option value="specific">Specific User (Single)</option>
            </select>
          </div>

          {target === "specific" && (
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>User UID or Email</label>
              <input
                value={specificUser}
                onChange={e => setSpecificUser(e.target.value)}
                placeholder="e.g. user@example.com or UID"
                required
                className="input"
              />
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary" disabled={sending} type="submit" style={{ width: '100%' }}>
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}