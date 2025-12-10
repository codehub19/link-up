import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { requestForToken, updateProfileAndStatus as updateProfile } from "../firebase"; // reusing updateProfileAndStatus as updateProfile for convenience or import correct one

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      setShowPrompt(true);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;
  return (
    <div style={{
      padding: "12px 24px",
      background: "#232a38",
      color: "#fff",
      position: "fixed",
      bottom: 16,
      left: "50%",
      transform: "translateX(-50%)",
      borderRadius: 8,
      boxShadow: "0 2px 8px #0005",
      zIndex: 1000
    }}>
      <span>Enable browser notifications to get updates instantly! </span>
      <button style={{
        background: "#ff5d7c", color: "#fff", border: "none",
        borderRadius: 4, marginLeft: 12, padding: "4px 12px", cursor: "pointer"
      }} onClick={() => {
        requestPermission().then(async () => {
          if (user) {
            const token = await requestForToken();
            if (token) {
              await updateProfile(user.uid, { fcmToken: token });
            }
          }
        })
      }}>Enable</button>
    </div>
  );
}