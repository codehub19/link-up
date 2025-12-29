
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { sendNotification } from './notifications'

export type SupportQuery = {
    id?: string
    uid: string
    userName?: string
    planId: string
    category: string
    message: string
    status: 'pending' | 'resolved'
    reply?: string
    createdAt?: any
    resolvedAt?: any
}

export const SUPPORT_CATEGORIES = [
    'Payment Issue',
    'Feature Request',
    'Account Issue',
    'Other',
]

export async function createSupportQuery(q: Omit<SupportQuery, 'id' | 'status' | 'createdAt' | 'resolvedAt'>) {
    return addDoc(collection(db, 'support_queries'), {
        ...q,
        status: 'pending',
        createdAt: serverTimestamp(),
    })
}

export async function listUserQueries(uid: string) {
    const q = query(
        collection(db, 'support_queries'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportQuery))
}

export async function listPendingQueries() {
    // Ordered by oldest first so admin handles queue
    const q = query(
        collection(db, 'support_queries'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
    )
    const snap = await getDocs(q)

    // Enrich with user name if possible, though easier to do in UI component
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportQuery))
}

export async function resolveQuery(queryId: string, reply: string) {
    const ref = doc(db, 'support_queries', queryId)
    await updateDoc(ref, {
        status: 'resolved',
        reply,
        resolvedAt: serverTimestamp(),
    })

    // Notify user
    const snap = await getDoc(ref)
    if (snap.exists()) {
        const data = snap.data() as SupportQuery
        await sendNotification({
            userUid: data.uid,
            title: 'Support Query Resolved ✅',
            body: `Admin replied: ${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}`,
        })
    }
}
