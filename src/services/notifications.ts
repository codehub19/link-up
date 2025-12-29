import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase'

export interface NotificationPayload {
    userUid: string
    title: string
    body: string
}

/**
 * Sends a notification to a specific user (In-App + Push).
 */
export async function sendNotification({ userUid, title, body }: NotificationPayload) {
    try {
        // 1. Add to Firestore (In-App History)
        await addDoc(collection(db, 'notifications'), {
            title,
            body,
            userUid,
            createdAt: serverTimestamp(),
            targetType: 'personal',
            seen: false
        })

        // 2. Send Push Notification (Cloud Function)
        const functions = getFunctions(undefined, 'asia-south2')
        const sendPush = httpsCallable(functions, 'sendPushNotification')

        // Cloud function expects 'userUids' array
        await sendPush({ userUids: [userUid], title, body })

    } catch (error) {
        console.error('Failed to send notification:', error)
        // Swallow error so we don't block the calling flow (e.g. payment approval)
    }
}
