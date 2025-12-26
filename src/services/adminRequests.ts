import {
    collection, getDocs, doc, updateDoc, deleteDoc, getDoc,
    query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'

// --- Types ---

export interface DeleteRequest {
    uid: string
    email?: string
    reason: string
    requestedAt: any
    status: 'pending' | 'approved' | 'rejected'
}

export interface Report {
    id: string
    reporterUid: string
    reportedUid: string
    threadId: string
    reason: string
    createdAt: any
    status?: 'open' | 'resolved' | 'dismissed'
}

// --- Delete Requests ---

export async function fetchDeleteRequests() {
    const q = query(
        collection(db, 'account_delete_requests'),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ ...d.data() } as DeleteRequest))
}

export async function approveDeleteRequest(uid: string) {
    // 1. Mark request as approved
    const reqRef = doc(db, 'account_delete_requests', uid)
    await updateDoc(reqRef, { status: 'approved', resolvedAt: serverTimestamp() })

    // 2. Delete User Document (Effectively deleting the account from app perspective)
    // Note: This does not delete from Auth or Storage automatically without Functions, 
    // but for this scope we just remove the user doc.
    // 2. Delete User Document
    const userRef = doc(db, 'users', uid)
    await deleteDoc(userRef)

    // 3. Delete from Authentication (requires Cloud Function)
    try {
        const functions = getFunctions(undefined, 'asia-south2')
        const deleteAuthValue = httpsCallable(functions, 'adminDeleteUser')
        await deleteAuthValue({ uid })
    } catch (e) {
        console.error('Failed to delete user from Auth:', e)
        // We do not rethrow, as the request is "approved" and data is gone.
        // Auth deletion failure might mean the user needs to be manually cleaned up or the function isn't deployed.
    }
}

export async function rejectDeleteRequest(uid: string) {
    const reqRef = doc(db, 'account_delete_requests', uid)
    await updateDoc(reqRef, { status: 'rejected', resolvedAt: serverTimestamp() })
}

// --- Reports ---

export async function fetchReports() {
    // Fetch all reports, maybe filter by status if we add that field (defaulting to showing all for now)
    // We can assume 'status' matches 'open' or is undefined
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report))
    // Client-side filter for open ones if needed, or just return all
    return reports
}

export async function resolveReport(reportId: string) {
    const ref = doc(db, 'reports', reportId)
    await updateDoc(ref, { status: 'resolved', resolvedAt: serverTimestamp() })
}

export async function dismissReport(reportId: string) {
    const ref = doc(db, 'reports', reportId)
    await updateDoc(ref, { status: 'dismissed', resolvedAt: serverTimestamp() })
}
