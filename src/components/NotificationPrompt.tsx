import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { requestForToken, updatePrivateProfile } from "../firebase";
import "./NotificationPrompt.css";

const DISMISS_KEY = "dateu.notifPromptDismissedAt";
const DISMISS_FOR_MS = 3 * 24 * 3600 * 1000; // ask again after 3 days

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/** Asks signed-in users to allow push notifications (matches, calls, messages). */
export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only ask when the browser can still show the permission dialog
    setShow(!!user && "Notification" in window && Notification.permission === "default" && !recentlyDismissed());
  }, [user]);

  if (!show) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted" && user) {
        const token = await requestForToken();
        if (token) await updatePrivateProfile(user.uid, { fcmToken: token });
      }
    } finally {
      setBusy(false);
      setShow(false);
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
    setShow(false);
  };

  return (
    <div className="notif-prompt" role="dialog" aria-label="Turn on notifications">
      <div className="notif-prompt-icon" aria-hidden="true">🔔</div>
      <div className="notif-prompt-text">
        <strong>Turn on notifications</strong>
        <span>Know instantly when you get a match, a call or a message.</span>
      </div>
      <div className="notif-prompt-actions">
        <button className="notif-prompt-later" onClick={dismiss}>Later</button>
        <button className="notif-prompt-allow" onClick={enable} disabled={busy}>{busy ? "…" : "Allow"}</button>
      </div>
    </div>
  );
}
