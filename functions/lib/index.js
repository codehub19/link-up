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
exports.confirmMatch = exports.joinMatchingRound = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.joinMatchingRound = functions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const roundId = data?.roundId || '';
    if (!roundId)
        throw new functions.https.HttpsError('invalid-argument', 'roundId is required');
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists)
        throw new functions.https.HttpsError('failed-precondition', 'User profile missing');
    const user = userDoc.data();
    if (user.gender !== 'male') {
        throw new functions.https.HttpsError('permission-denied', 'Only male users can join round');
    }
    const roundDocRef = db.doc(`matchingRounds/${roundId}`);
    const roundDoc = await roundDocRef.get();
    if (!roundDoc.exists)
        throw new functions.https.HttpsError('not-found', 'Round not found');
    const round = roundDoc.data();
    if (!round.isActive)
        throw new functions.https.HttpsError('failed-precondition', 'Round is not active');
    await db.runTransaction(async (tx) => {
        const rSnap = await tx.get(roundDocRef);
        const current = rSnap.data() || {};
        const arr = (current.participatingMales ?? []);
        if (!arr.includes(uid))
            arr.push(uid);
        tx.update(roundDocRef, { participatingMales: arr });
        tx.update(db.doc(`users/${uid}`), { lastActivePlan: roundId });
    });
    return { status: 'ok' };
});
exports.confirmMatch = functions.https.onCall(async (data, context) => {
    const boyUid = context.auth?.uid;
    if (!boyUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const roundId = data?.roundId || '';
    const girlUid = data?.girlUid || '';
    if (!roundId || !girlUid)
        throw new functions.https.HttpsError('invalid-argument', 'roundId and girlUid are required');
    // Verify that a like exists from girl -> boy in this round
    const likeId = `${roundId}_${girlUid}_${boyUid}`;
    const likeSnap = await db.doc(`likes/${likeId}`).get();
    if (!likeSnap.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Like not found');
    }
    // Ensure not already matched
    const matches = await db
        .collection('matches')
        .where('boyUid', '==', boyUid)
        .where('girlUid', '==', girlUid)
        .limit(1)
        .get();
    if (!matches.empty) {
        return { status: 'already-confirmed' };
    }
    await db.collection('matches').add({
        participants: [boyUid, girlUid],
        boyUid,
        girlUid,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { status: 'ok' };
});
//# sourceMappingURL=index.js.map