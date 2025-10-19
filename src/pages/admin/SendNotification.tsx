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
    <div>
      <h2>Send Notification</h2>
      <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required className="field-input" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Body" required className="field-input" />
        <select value={target} onChange={e => setTarget(e.target.value)} className="field-input">
          <option value="all">All users</option>
          <option value="verified">Verified users</option>
          <option value="female">Female users</option>
          <option value="male">Male users</option>
          <option value="specific">Specific user (by UID or email)</option>
        </select>
        {target === "specific" && (
          <input
            value={specificUser}
            onChange={e => setSpecificUser(e.target.value)}
            placeholder="User UID or email"
            required
            className="field-input"
            style={{ margin: "8px 0" }}
          />
        )}
        <button className="btn-gradient" disabled={sending} type="submit">
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
      {status && <div style={{ color: "green" }}>{status}</div>}
    </div>
  );
}