"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPaymentApproved = exports.adminApprovePayment = exports.adminPromoteMatch = exports.confirmMatch = exports.joinMatchingRound = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
async function isRequesterAdmin(uid) {
    if (!uid)
        return false;
    const u = await db.collection('users').doc(uid).get();
    return !!u.exists && u.data()?.isAdmin === true;
}
async function getActiveSubscription(uid) {
    // Avoid composite indexes: query by uid only, filter in code
    const snap = await db
        .collection('subscriptions')
        .where('uid', '==', uid)
        .limit(10)
        .get();
    if (snap.empty)
        return null;
    // Prefer a sub that is active and has remainingMatches > 0
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const withRemaining = docs.find(s => s.status === 'active' && Number(s.remainingMatches ?? 0) > 0);
    const anyActive = withRemaining || docs.find(s => s.status === 'active');
    return anyActive || null;
}
async function getActiveRoundId() {
    const r = await db.collection('matchingRounds').where('isActive', '==', true).limit(1).get();
    return r.empty ? null : r.docs[0].id;
}
async function createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota = 0) {
    const planSnap = await db.collection('plans').doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : undefined;
    const quota = Number(plan?.matchQuota ?? plan?.quota ?? fallbackQuota ?? 0);
    if (!quota || quota <= 0) {
        console.log('[provision] No quota found', { planId, hasPlanDoc: !!planSnap.exists, fallbackQuota });
        throw new https_1.HttpsError('failed-precondition', 'Plan has no quota (matchQuota/quota missing).');
    }
    const active = await getActiveSubscription(uid);
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (active) {
        await db.collection('subscriptions').doc(active.id).update({
            remainingMatches: admin.firestore.FieldValue.increment(quota),
            updatedAt: now,
        });
    }
    else {
        await db.collection('subscriptions').add({
            uid,
            planId,
            status: 'active',
            matchQuota: quota,
            remainingMatches: quota,
            supportAvailable: !!plan?.supportAvailable,
            createdAt: now,
            updatedAt: now,
        });
    }
    const roundId = await getActiveRoundId();
    if (roundId) {
        await db.collection('matchingRounds').doc(roundId).update({
            participatingMales: admin.firestore.FieldValue.arrayUnion(uid),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}
/**
 * Join active round – region pinned to us-central1
 */
exports.joinMatchingRound = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const auth = req.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const { roundId } = (req.data || {});
    if (!roundId)
        throw new https_1.HttpsError('invalid-argument', 'roundId is required');
    const userRef = db.collection('users').doc(auth.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists)
        throw new https_1.HttpsError('failed-precondition', 'User profile missing');
    const gender = userSnap.data()?.gender;
    if (gender !== 'male' && gender !== 'female')
        throw new https_1.HttpsError('failed-precondition', 'Gender missing');
    const roundRef = db.collection('matchingRounds').doc(roundId);
    const roundSnap = await roundRef.get();
    if (!roundSnap.exists)
        throw new https_1.HttpsError('not-found', 'Round not found');
    if (roundSnap.data()?.isActive !== true)
        throw new https_1.HttpsError('failed-precondition', 'Round not active');
    const field = gender === 'male' ? 'participatingMales' : 'participatingFemales';
    await roundRef.update({
        [field]: admin.firestore.FieldValue.arrayUnion(auth.uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
/**
 * Boy confirms a girl's like – enforces subscription quota (us-central1)
 */
exports.confirmMatch = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const auth = req.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const { roundId, girlUid } = (req.data || {});
    if (!roundId || !girlUid)
        throw new https_1.HttpsError('invalid-argument', 'roundId and girlUid are required');
    const boyUid = auth.uid;
    const sub = await getActiveSubscription(boyUid);
    if (!sub || (sub.remainingMatches ?? 0) <= 0) {
        throw new https_1.HttpsError('failed-precondition', 'No active subscription or quota exhausted');
    }
    const likeId = `${roundId}_${girlUid}_${boyUid}`;
    const likeRef = db.collection('likes').doc(likeId);
    const likeSnap = await likeRef.get();
    if (!likeSnap.exists)
        throw new https_1.HttpsError('failed-precondition', 'Like not found');
    const matchId = `${roundId}_${boyUid}_${girlUid}`;
    const matchRef = db.collection('matches').doc(matchId);
    const subRef = db.collection('subscriptions').doc(sub.id);
    const roundRef = db.collection('matchingRounds').doc(roundId);
    await db.runTransaction(async (tx) => {
        const [mSnap, sSnap] = await Promise.all([tx.get(matchRef), tx.get(subRef)]);
        if (mSnap.exists)
            return;
        const curr = sSnap.data();
        const remaining = Number(curr?.remainingMatches ?? 0);
        if (remaining <= 0)
            throw new https_1.HttpsError('failed-precondition', 'Quota exhausted');
        tx.set(matchRef, {
            roundId,
            participants: [boyUid, girlUid],
            boyUid,
            girlUid,
            status: 'confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        const next = remaining - 1;
        tx.update(subRef, {
            remainingMatches: next,
            status: next <= 0 ? 'expired' : 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (next <= 0) {
            tx.update(roundRef, {
                participatingMales: admin.firestore.FieldValue.arrayRemove(boyUid),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    return { ok: true };
});
/**
 * Admin promotes to match – enforces boy's subscription quota (us-central1)
 */
exports.adminPromoteMatch = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const caller = req.auth?.uid;
    if (!(await isRequesterAdmin(caller)))
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const { roundId, boyUid, girlUid } = (req.data || {});
    if (!roundId || !boyUid || !girlUid)
        throw new https_1.HttpsError('invalid-argument', 'roundId, boyUid, girlUid required');
    const sub = await getActiveSubscription(boyUid);
    if (!sub || (sub.remainingMatches ?? 0) <= 0) {
        throw new https_1.HttpsError('failed-precondition', 'Boy has no active subscription or quota exhausted');
    }
    const matchId = `${roundId}_${boyUid}_${girlUid}`;
    const matchRef = db.collection('matches').doc(matchId);
    const subRef = db.collection('subscriptions').doc(sub.id);
    const roundRef = db.collection('matchingRounds').doc(roundId);
    await db.runTransaction(async (tx) => {
        const [mSnap, sSnap] = await Promise.all([tx.get(matchRef), tx.get(subRef)]);
        if (mSnap.exists)
            return;
        const curr = sSnap.data();
        const remaining = Number(curr?.remainingMatches ?? 0);
        if (remaining <= 0)
            throw new https_1.HttpsError('failed-precondition', 'Quota exhausted');
        tx.set(matchRef, {
            roundId,
            participants: [boyUid, girlUid],
            boyUid,
            girlUid,
            status: 'confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        const next = remaining - 1;
        tx.update(subRef, {
            remainingMatches: next,
            status: next <= 0 ? 'expired' : 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (next <= 0) {
            tx.update(roundRef, {
                participatingMales: admin.firestore.FieldValue.arrayRemove(boyUid),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    return { ok: true };
});
/**
 * Admin approves a payment and provisions subscription immediately (us-central1)
 */
exports.adminApprovePayment = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const caller = req.auth?.uid;
    if (!caller)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    if (!(await isRequesterAdmin(caller)))
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const paymentId = req.data?.paymentId;
    if (!paymentId)
        throw new https_1.HttpsError('invalid-argument', 'paymentId is required');
    const payRef = db.collection('payments').doc(paymentId);
    const snap = await payRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Payment not found');
    const p = snap.data();
    const uid = String(p.uid || '');
    const planId = String(p.planId || '');
    const fallbackQuota = Number(p.matchQuota ?? p.quota ?? 0);
    if (!uid || !planId)
        throw new https_1.HttpsError('failed-precondition', 'Payment missing uid/planId');
    await payRef.update({
        status: 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota);
    return { ok: true };
});
/**
 * Safety net: Firestore trigger (asia-south2) on payments → approved
 */
exports.onPaymentApproved = (0, firestore_1.onDocumentUpdated)({ document: 'payments/{paymentId}', region: 'asia-south2' }, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after)
        return;
    if (before?.status === 'approved' || after?.status !== 'approved')
        return;
    const uid = after.uid;
    const planId = after.planId;
    const fallbackQuota = Number(after.matchQuota ?? after.quota ?? 0);
    if (!uid || !planId)
        return;
    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota);
});
//# sourceMappingURL=index.js.map