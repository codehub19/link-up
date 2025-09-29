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
exports.repairUserSubscription = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
async function isAdmin(uid) {
    if (!uid)
        return false;
    const u = await db.collection('users').doc(uid).get();
    return !!u.exists && u.data()?.isAdmin === true;
}
exports.repairUserSubscription = (0, https_1.onCall)(async (req) => {
    const caller = req.auth?.uid;
    if (!await isAdmin(caller))
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const { uid } = (req.data || {});
    if (!uid)
        throw new https_1.HttpsError('invalid-argument', 'uid is required');
    const pays = await db.collection('payments').where('uid', '==', uid).where('status', '==', 'approved').get();
    if (pays.empty)
        return { repaired: false, message: 'No approved payments' };
    let total = 0;
    let lastPlanId = '';
    for (const d of pays.docs) {
        const p = d.data();
        const planId = String(p.planId || '');
        lastPlanId = planId || lastPlanId;
        let q = Number(p.matchQuota ?? p.quota ?? 0);
        if (!q && planId) {
            const ps = await db.collection('plans').doc(planId).get();
            if (ps.exists)
                q = Number(ps.data().matchQuota ?? ps.data().quota ?? 0);
        }
        if (q > 0)
            total += q;
    }
    if (total <= 0)
        return { repaired: false, message: 'No quota found' };
    const active = await db.collection('subscriptions').where('uid', '==', uid).where('status', '==', 'active').limit(1).get();
    if (active.empty) {
        await db.collection('subscriptions').add({
            uid, planId: lastPlanId || 'unknown',
            status: 'active', matchQuota: total, remainingMatches: total,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    else {
        await active.docs[0].ref.update({
            status: 'active', matchQuota: total, remainingMatches: total,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return { repaired: true, totalQuota: total };
});
//# sourceMappingURL=repair.js.map