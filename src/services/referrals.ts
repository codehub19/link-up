
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    runTransaction
} from 'firebase/firestore'
import { db } from '../firebase'

export type ReferralClaim = {
    id?: string
    uid: string
    amount: number
    upiId: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt?: any
}

// Generate a simple code: First 4 chars of name (upper) + 4 random digits
export function generateReferralCode(name: string) {
    const prefix = (name || 'USER').substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}${random}`
}

export async function assignReferralCode(uid: string, name: string) {
    let code = generateReferralCode(name)
    let unique = false
    // Retry a few times if collision
    for (let i = 0; i < 5; i++) {
        const q = query(collection(db, 'users'), where('referralCode', '==', code))
        const snap = await getDocs(q)
        if (snap.empty) {
            unique = true
            break
        }
        code = generateReferralCode(name)
    }

    if (unique) {
        await updateDoc(doc(db, 'users', uid), { referralCode: code })
        return code
    }
    throw new Error("Failed to generate unique referral code")
}

export async function validateReferralCode(code: string) {
    if (!code) return null
    const q = query(collection(db, 'users'), where('referralCode', '==', code))
    const snap = await getDocs(q)
    if (snap.empty) return null
    return snap.docs[0].id // Return referrer UID
}

export async function createReferralRecord(referrerUid: string, refereeUid: string, refereeName: string) {
    // Create a record in 'referrals' collection
    await addDoc(collection(db, 'referrals'), {
        referrerUid,
        refereeUid,
        refereeName: refereeName || 'Unknown',
        createdAt: serverTimestamp(),
        hasMatched: false,
        status: 'pending'
    })
}

export async function updateReferralMatchStatus(refereeUid: string) {
    // Find the referral record where this user is the referee
    const q = query(collection(db, 'referrals'), where('refereeUid', '==', refereeUid))
    const snap = await getDocs(q)

    if (snap.empty) return

    // Update all matching records (should be one usually)
    const updates = snap.docs.map(d => updateDoc(d.ref, { hasMatched: true, status: 'qualified' }))
    await Promise.all(updates)
}

export async function getReferralStats(uid: string) {
    // Query 'referrals' collection
    const q = query(collection(db, 'referrals'), where('referrerUid', '==', uid))
    const snap = await getDocs(q)

    const totalReferrals = snap.size
    let qualifiedReferrals = 0

    const referrals = snap.docs.map(d => {
        const data = d.data()
        if (data.hasMatched) qualifiedReferrals++
        return data
    })

    return {
        totalReferrals,
        qualifiedReferrals,
        referrals
    }
}

export async function createReferralClaim(uid: string, amount: number, upiId: string) {
    return addDoc(collection(db, 'referral_claims'), {
        uid,
        amount,
        upiId,
        status: 'pending',
        createdAt: serverTimestamp()
    })
}

export async function listPendingClaims() {
    const q = query(collection(db, 'referral_claims'), where('status', '==', 'pending'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralClaim))
}

export async function getMyClaims(uid: string) {
    const q = query(collection(db, 'referral_claims'), where('uid', '==', uid))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralClaim))
}

export async function approveClaim(claimId: string, adminUid: string) {
    const ref = doc(db, 'referral_claims', claimId)
    await updateDoc(ref, {
        status: 'approved',
        approvedBy: adminUid,
        processedAt: serverTimestamp()
    })

    // Create notification or update user's total earnings paid?
    // We should update user's `referralEarningsPaid` so they can't claim again for the same amount?
    // Actually, the claim amount is calculated as (Total Earned - Paid). 
    // So when approving, we MUST update `referralEarningsPaid` on the user.

    await runTransaction(db, async (t) => {
        const claimSnap = await t.get(ref)
        if (!claimSnap.exists()) throw new Error("Claim missing")
        const claim = claimSnap.data() as ReferralClaim

        const userRef = doc(db, 'users', claim.uid)
        const userSnap = await t.get(userRef)
        const userData = userSnap.data() || {}

        const currentPaid = userData.referralEarningsPaid || 0
        t.update(userRef, { referralEarningsPaid: currentPaid + claim.amount })
        t.update(ref, { status: 'approved', processedAt: serverTimestamp() })
    })
}

export async function rejectClaim(claimId: string, reason: string) {
    const ref = doc(db, 'referral_claims', claimId)
    await updateDoc(ref, {
        status: 'rejected',
        reason,
        processedAt: serverTimestamp()
    })
}
