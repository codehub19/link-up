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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.joinMatchingRound = (0, https_1.onCall)(async (request) => {
    const auth = request.auth;
    const data = request.data;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    }
    const uid = auth.uid;
    const roundId = data?.roundId;
    if (!roundId) {
        throw new https_1.HttpsError('invalid-argument', 'roundId is required');
    }
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'User profile missing');
    }
    const user = userSnap.data() || {};
    const gender = user.gender;
    if (gender !== 'male' && gender !== 'female') {
        throw new https_1.HttpsError('failed-precondition', 'User gender missing');
    }
    const roundRef = db.collection('matchingRounds').doc(roundId);
    const roundSnap = await roundRef.get();
    if (!roundSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Round not found');
    }
    const round = roundSnap.data() || {};
    if (round.isActive !== true) {
        throw new https_1.HttpsError('failed-precondition', 'Round is not active');
    }
    const field = gender === 'male' ? 'participatingMales' : 'participatingFemales';
    await roundRef.update({
        [field]: admin.firestore.FieldValue.arrayUnion(uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { status: 'ok' };
});
exports.confirmMatch = (0, https_1.onCall)(async (request) => {
    const auth = request.auth;
    const data = request.data;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    }
    const boyUid = auth.uid;
    const roundId = data?.roundId;
    const girlUid = data?.girlUid;
    if (!roundId || !girlUid) {
        throw new https_1.HttpsError('invalid-argument', 'roundId and girlUid are required');
    }
    // Verify a like exists from girl -> boy in this round
    const likeId = `${roundId}_${girlUid}_${boyUid}`;
    const likeRef = db.collection('likes').doc(likeId);
    const likeSnap = await likeRef.get();
    if (!likeSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'Like not found for this pair');
    }
    // Create match (include fields used by UI)
    const matchId = `${roundId}_${boyUid}_${girlUid}`;
    const matchRef = db.collection('matches').doc(matchId);
    await matchRef.set({
        roundId,
        participants: [boyUid, girlUid],
        boyUid,
        girlUid,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: 'ok' };
});
//# sourceMappingURL=index.js.map