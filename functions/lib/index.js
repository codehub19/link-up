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
exports.onPaymentApproved = exports.adminApprovePayment = void 0;
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
    const snap = await db
        .collection('subscriptions')
        .where('uid', '==', uid)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
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
        console.log('[adminApprovePayment] No quota found', { planId, planDocExists: !!planSnap.exists, fallbackQuota });
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
// Explicitly pin region so client and backend match (your client is calling us-central1)
exports.adminApprovePayment = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const caller = req.auth?.uid;
    console.log('[adminApprovePayment] start', { caller });
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
    console.log('[adminApprovePayment] approving', { paymentId, uid, planId, fallbackQuota });
    await payRef.update({
        status: 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota);
    console.log('[adminApprovePayment] done', { paymentId });
    return { ok: true };
});
// Keep your onPaymentApproved trigger too (pin to your Firestore/Eventarc region)
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
    console.log('[onPaymentApproved] provisioning', { uid, planId, fallbackQuota });
    await createOrMergeSubscriptionFromPayment(uid, planId, fallbackQuota);
});
//# sourceMappingURL=index.js.map