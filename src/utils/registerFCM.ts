import { messaging } from "../firebase";
import { getToken } from "firebase/messaging";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export async function registerForPushNotifications(userUid: string, vapidKey: string) {
  try {
    const status = await Notification.requestPermission();
    if (status !== "granted") throw new Error("Permission denied");
    const token = await getToken(messaging, { vapidKey });
    await setDoc(doc(db, "users", userUid), { fcmToken: token }, { merge: true });
    return token;
  } catch (err) {
    console.error("Push registration failed:", err);
    return null;
  }
}