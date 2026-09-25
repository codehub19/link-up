import { messaging } from "../firebase";
import { getToken } from "firebase/messaging";
import { updatePrivateProfile } from "../firebase";

export async function registerForPushNotifications(userUid: string, vapidKey: string) {
  try {
    const status = await Notification.requestPermission();
    if (status !== "granted") throw new Error("Permission denied");
    const token = await getToken(messaging, { vapidKey });
    await updatePrivateProfile(userUid, { fcmToken: token });
    return token;
  } catch (err) {
    console.error("Push registration failed:", err);
    return null;
  }
}