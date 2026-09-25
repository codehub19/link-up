import * as admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFcmTokens } from './push'
import * as logger from 'firebase-functions/logger'

const REGION = 'asia-south2'

export const onMessageCreate = onDocumentCreated(
    { document: 'threads/{threadId}/messages/{messageId}', region: REGION },
    async (event) => {
        const snap = event.data
        if (!snap) return

        const message = snap.data()
        const { threadId } = event.params
        const senderUid = message.senderUid
        const text = message.audioUrl || message.type === 'audio' ? '🎤 Voice message' : (message.text || 'Sent a message')

        // Fetch thread to get specific participants or group name if applicable
        // For now assuming 1:1 or small group stored in participants array
        const threadSnap = await admin.firestore().collection('threads').doc(threadId).get()
        const threadData = threadSnap.data()

        if (!threadData) {
            logger.warn('Thread not found for notification', { threadId })
            return
        }

        const participants = (threadData.participants || []) as string[]
        const recipients = participants.filter(uid => uid !== senderUid)

        if (recipients.length === 0) return

        // Get sender name
        const senderSnap = await admin.firestore().collection('users').doc(senderUid).get()
        const senderName = senderSnap.exists ? (senderSnap.data()?.name || 'Someone') : 'Someone'

        const tokens = await getFcmTokens(recipients)

        if (tokens.length > 0) {
            const payload = {
                data: {
                    title: senderName,
                    body: text,
                    threadId,
                    // Opens this conversation (the chat screen is keyed by the other person)
                    url: `/dashboard/chat?with=${encodeURIComponent(senderUid)}`
                }
            }

            const response = await admin.messaging().sendEachForMulticast({
                tokens,
                data: payload.data
            })

            logger.info('Notifications sent', {
                successCount: response.successCount,
                failureCount: response.failureCount,
                threadId
            })

            // Optional: Cleanup invalid tokens
            if (response.failureCount > 0) {
                // Logic to remove bad tokens could go here
            }
        }
    }
)
