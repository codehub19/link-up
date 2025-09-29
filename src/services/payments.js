"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayment = createPayment;
exports.listPendingPayments = listPendingPayments;
exports.approvePayment = approvePayment;
exports.approveAndProvisionPayment = approveAndProvisionPayment;
exports.rejectPayment = rejectPayment;
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
var functions_1 = require("firebase/functions");
var firebase_1 = require("../firebase");
var rounds_1 = require("./rounds");
var firestore_2 = require("firebase/firestore");
function createPayment(p, proofFile) {
    return __awaiter(this, void 0, void 0, function () {
        var proofUrl, r, docRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    proofUrl = undefined;
                    if (!proofFile) return [3 /*break*/, 3];
                    r = (0, storage_1.ref)(firebase_1.storage, "payments/".concat(p.uid, "/").concat(Date.now(), "_").concat(proofFile.name));
                    return [4 /*yield*/, (0, storage_1.uploadBytes)(r, proofFile, { contentType: proofFile.type || 'image/jpeg' })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, storage_1.getDownloadURL)(r)];
                case 2:
                    proofUrl = _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'payments'), __assign(__assign({}, p), { proofUrl: proofUrl, status: 'pending', createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }))];
                case 4:
                    docRef = _a.sent();
                    return [2 /*return*/, docRef.id];
            }
        });
    });
}
function listPendingPayments() {
    return __awaiter(this, void 0, void 0, function () {
        var qy, snap;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    qy = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'payments'), (0, firestore_1.where)('status', '==', 'pending'));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(qy)];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); })];
            }
        });
    });
}
/**
 * Legacy approve: flips status and best-effort join round via callable.
 */
function approvePayment(paymentId) {
    return __awaiter(this, void 0, void 0, function () {
        var ref, snap, data, fns, join, active, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ref = (0, firestore_1.doc)(firebase_1.db, 'payments', paymentId);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(ref)];
                case 1:
                    snap = _b.sent();
                    if (!snap.exists())
                        throw new Error('Payment not found');
                    data = snap.data();
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(ref, { status: 'approved', updatedAt: (0, firestore_1.serverTimestamp)() })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    fns = (0, functions_1.getFunctions)();
                    join = (0, functions_1.httpsCallable)(fns, 'joinMatchingRound');
                    return [4 /*yield*/, (0, rounds_1.getActiveRound)()];
                case 4:
                    active = _b.sent();
                    if (!active)
                        throw new Error('No active round');
                    return [4 /*yield*/, join({ roundId: active.id })];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * New approve that also provisions a subscription on the client (Admin only via rules).
 * - Sets payment approved
 * - Adds/increments subscriptions remainingMatches from plan.matchQuota/quota
 * - Adds the user to active round's participatingMales
 */
function approveAndProvisionPayment(paymentId) {
    return __awaiter(this, void 0, void 0, function () {
        var payRef, paySnap, p, planRef, planSnap, quota, pd, subQ, subSnap, subRef, active, roundRef, _a;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    payRef = (0, firestore_1.doc)(firebase_1.db, 'payments', paymentId);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(payRef)];
                case 1:
                    paySnap = _f.sent();
                    if (!paySnap.exists())
                        throw new Error('Payment not found');
                    p = paySnap.data();
                    if (!p.uid || !p.planId)
                        throw new Error('Payment missing uid or planId');
                    planRef = (0, firestore_1.doc)(firebase_1.db, 'plans', p.planId);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(planRef)];
                case 2:
                    planSnap = _f.sent();
                    quota = 0;
                    if (planSnap.exists()) {
                        pd = planSnap.data();
                        quota = Number((_c = (_b = pd.matchQuota) !== null && _b !== void 0 ? _b : pd.quota) !== null && _c !== void 0 ? _c : 0);
                    }
                    if (!quota)
                        quota = Number((_e = (_d = p.matchQuota) !== null && _d !== void 0 ? _d : p.quota) !== null && _e !== void 0 ? _e : 0);
                    quota = Math.floor(Number(quota || 0));
                    if (!quota || quota <= 0)
                        throw new Error('Plan has no matchQuota/quota configured');
                    // Approve payment
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(payRef, { status: 'approved', updatedAt: (0, firestore_1.serverTimestamp)() })
                        // Find existing active subscription
                    ];
                case 3:
                    // Approve payment
                    _f.sent();
                    subQ = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'subscriptions'), (0, firestore_1.where)('uid', '==', p.uid), (0, firestore_1.where)('status', '==', 'active'), (0, firestore_1.limit)(1));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(subQ)];
                case 4:
                    subSnap = _f.sent();
                    if (!!subSnap.empty) return [3 /*break*/, 6];
                    subRef = (0, firestore_1.doc)(firebase_1.db, 'subscriptions', subSnap.docs[0].id);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(subRef, {
                            remainingMatches: (0, firestore_2.increment)(quota),
                            updatedAt: (0, firestore_1.serverTimestamp)(),
                        })];
                case 5:
                    _f.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'subscriptions'), {
                        uid: p.uid,
                        planId: p.planId,
                        status: 'active',
                        matchQuota: quota,
                        remainingMatches: quota,
                        createdAt: (0, firestore_1.serverTimestamp)(),
                        updatedAt: (0, firestore_1.serverTimestamp)(),
                    })];
                case 7:
                    _f.sent();
                    _f.label = 8;
                case 8:
                    _f.trys.push([8, 12, , 13]);
                    return [4 /*yield*/, (0, rounds_1.getActiveRound)()];
                case 9:
                    active = _f.sent();
                    if (!(active === null || active === void 0 ? void 0 : active.id)) return [3 /*break*/, 11];
                    roundRef = (0, firestore_1.doc)(firebase_1.db, 'matchingRounds', active.id);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(roundRef, {
                            participatingMales: (0, firestore_2.arrayUnion)(p.uid),
                            updatedAt: (0, firestore_1.serverTimestamp)(),
                        })];
                case 10:
                    _f.sent();
                    _f.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    _a = _f.sent();
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function rejectPayment(paymentId, reason) {
    return __awaiter(this, void 0, void 0, function () {
        var ref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ref = (0, firestore_1.doc)(firebase_1.db, 'payments', paymentId);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(ref, { status: 'rejected', updatedAt: (0, firestore_1.serverTimestamp)(), reason: reason || null })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
