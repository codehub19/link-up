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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveRound = getActiveRound;
exports.listRounds = listRounds;
exports.createRound = createRound;
exports.setActiveRound = setActiveRound;
exports.syncApprovedMalesToActiveRound = syncApprovedMalesToActiveRound;
exports.addMaleToActiveRound = addMaleToActiveRound;
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../firebase");
function getActiveRound() {
    return __awaiter(this, void 0, void 0, function () {
        var q, snap;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'matchingRounds'), (0, firestore_1.where)('isActive', '==', true));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(q)];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, snap.docs[0] ? __assign({ id: snap.docs[0].id }, snap.docs[0].data()) : null];
            }
        });
    });
}
function listRounds() {
    return __awaiter(this, void 0, void 0, function () {
        var snap;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'matchingRounds'))];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); })];
            }
        });
    });
}
function createRound(roundId) {
    return __awaiter(this, void 0, void 0, function () {
        var ref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ref = (0, firestore_1.doc)(firebase_1.db, 'matchingRounds', roundId);
                    return [4 /*yield*/, (0, firestore_1.setDoc)(ref, {
                            roundId: roundId,
                            isActive: false,
                            participatingMales: [],
                            participatingFemales: [],
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            updatedAt: (0, firestore_1.serverTimestamp)(),
                        }, { merge: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function setActiveRound(roundId) {
    return __awaiter(this, void 0, void 0, function () {
        var batch, all;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    batch = (0, firestore_1.writeBatch)(firebase_1.db);
                    return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'matchingRounds'))];
                case 1:
                    all = _a.sent();
                    all.forEach(function (docSnap) {
                        var ref = (0, firestore_1.doc)(firebase_1.db, 'matchingRounds', docSnap.id);
                        batch.update(ref, { isActive: roundId !== '' && docSnap.id === roundId });
                    });
                    return [4 /*yield*/, batch.commit()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Admin utility:
 * - Finds the active round
 * - Collects all approved payments
 * - Filters to male users with complete profiles
 * - Unions them into participatingMales
 */
function syncApprovedMalesToActiveRound() {
    return __awaiter(this, void 0, void 0, function () {
        var active, paySnap, uids, maleUids, _i, uids_1, uid, us, u, roundRef, roundSnap, existing, merged;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getActiveRound()];
                case 1:
                    active = _b.sent();
                    if (!active)
                        throw new Error('No active round');
                    return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'payments'), (0, firestore_1.where)('status', '==', 'approved')))];
                case 2:
                    paySnap = _b.sent();
                    uids = Array.from(new Set(paySnap.docs.map(function (d) { return d.data().uid; })));
                    maleUids = [];
                    _i = 0, uids_1 = uids;
                    _b.label = 3;
                case 3:
                    if (!(_i < uids_1.length)) return [3 /*break*/, 6];
                    uid = uids_1[_i];
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid))];
                case 4:
                    us = _b.sent();
                    if (!us.exists())
                        return [3 /*break*/, 5];
                    u = us.data();
                    if (u.gender === 'male' && u.isProfileComplete === true)
                        maleUids.push(uid);
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    roundRef = (0, firestore_1.doc)(firebase_1.db, 'matchingRounds', active.id);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(roundRef)];
                case 7:
                    roundSnap = _b.sent();
                    existing = ((_a = roundSnap.data()) === null || _a === void 0 ? void 0 : _a.participatingMales) || [];
                    merged = Array.from(new Set(__spreadArray(__spreadArray([], existing, true), maleUids, true)));
                    return [4 /*yield*/, (0, firestore_1.setDoc)(roundRef, {
                            participatingMales: merged,
                            updatedAt: (0, firestore_1.serverTimestamp)(),
                        }, { merge: true })];
                case 8:
                    _b.sent();
                    return [2 /*return*/, {
                            activeRoundId: active.id,
                            addedCount: merged.length - existing.length,
                            totalMales: merged.length,
                        }];
            }
        });
    });
}
/**
 * Quick helper to add a single male uid to the active round.
 */
function addMaleToActiveRound(uid) {
    return __awaiter(this, void 0, void 0, function () {
        var active, roundRef, roundSnap, existing, merged;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getActiveRound()];
                case 1:
                    active = _b.sent();
                    if (!active)
                        throw new Error('No active round');
                    roundRef = (0, firestore_1.doc)(firebase_1.db, 'matchingRounds', active.id);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(roundRef)];
                case 2:
                    roundSnap = _b.sent();
                    existing = ((_a = roundSnap.data()) === null || _a === void 0 ? void 0 : _a.participatingMales) || [];
                    if (existing.includes(uid))
                        return [2 /*return*/, { changed: false }];
                    merged = __spreadArray(__spreadArray([], existing, true), [uid], false);
                    return [4 /*yield*/, (0, firestore_1.setDoc)(roundRef, { participatingMales: merged, updatedAt: (0, firestore_1.serverTimestamp)() }, { merge: true })];
                case 3:
                    _b.sent();
                    return [2 /*return*/, { changed: true }];
            }
        });
    });
}
