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
exports.serverTimestamp = exports.updateDoc = exports.setDoc = exports.getDoc = exports.doc = exports.provider = exports.functions = exports.storage = exports.db = exports.auth = exports.app = void 0;
exports.signInWithGoogle = signInWithGoogle;
exports.signOut = signOut;
exports.ensureUserDocument = ensureUserDocument;
exports.uploadProfilePhoto = uploadProfilePhoto;
exports.saveUserProfile = saveUserProfile;
exports.callJoinMatchingRound = callJoinMatchingRound;
exports.callConfirmMatch = callConfirmMatch;
exports.callAdminPromoteMatch = callAdminPromoteMatch;
exports.callAdminApprovePayment = callAdminApprovePayment;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
Object.defineProperty(exports, "doc", { enumerable: true, get: function () { return firestore_1.doc; } });
Object.defineProperty(exports, "getDoc", { enumerable: true, get: function () { return firestore_1.getDoc; } });
Object.defineProperty(exports, "serverTimestamp", { enumerable: true, get: function () { return firestore_1.serverTimestamp; } });
Object.defineProperty(exports, "setDoc", { enumerable: true, get: function () { return firestore_1.setDoc; } });
Object.defineProperty(exports, "updateDoc", { enumerable: true, get: function () { return firestore_1.updateDoc; } });
var storage_1 = require("firebase/storage");
var functions_1 = require("firebase/functions");
// Configure from .env
var firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};
exports.app = (0, app_1.initializeApp)(firebaseConfig);
exports.auth = (0, auth_1.getAuth)(exports.app);
exports.db = (0, firestore_1.getFirestore)(exports.app);
exports.storage = (0, storage_1.getStorage)(exports.app, "gs://".concat(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET));
// IMPORTANT: pin to same region as your HTTPS callables
exports.functions = (0, functions_1.getFunctions)(exports.app, 'us-central1');
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    (0, auth_1.connectAuthEmulator)(exports.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    (0, firestore_1.connectFirestoreEmulator)(exports.db, '127.0.0.1', 8080);
    (0, storage_1.connectStorageEmulator)(exports.storage, '127.0.0.1', 9199);
    (0, functions_1.connectFunctionsEmulator)(exports.functions, '127.0.0.1', 5001);
}
// … keep the rest of this file unchanged …
// Auth helpers…
/* keep rest of the file unchanged */
// Auth helpers
exports.provider = new auth_1.GoogleAuthProvider();
function signInWithGoogle() {
    return __awaiter(this, void 0, void 0, function () {
        var cred, info, isNewUser;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, auth_1.signInWithPopup)(exports.auth, exports.provider)];
                case 1:
                    cred = _a.sent();
                    info = (0, auth_1.getAdditionalUserInfo)(cred);
                    isNewUser = (info === null || info === void 0 ? void 0 : info.isNewUser) === true;
                    return [2 /*return*/, { user: cred.user, isNewUser: isNewUser }];
            }
        });
    });
}
function signOut() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, auth_1.signOut)(exports.auth)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Ensure users/{uid} exists and lightly update on login.
function ensureUserDocument(userOrUid, email, displayName, photoURL) {
    return __awaiter(this, void 0, void 0, function () {
        var uid, em, nm, photo, u, userRef, snap;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    em = null;
                    nm = null;
                    photo = null;
                    if (typeof userOrUid === 'string') {
                        uid = userOrUid;
                        em = email !== null && email !== void 0 ? email : null;
                        nm = displayName !== null && displayName !== void 0 ? displayName : null;
                        photo = photoURL !== null && photoURL !== void 0 ? photoURL : null;
                    }
                    else {
                        u = userOrUid;
                        uid = u === null || u === void 0 ? void 0 : u.uid;
                        em = (_a = u === null || u === void 0 ? void 0 : u.email) !== null && _a !== void 0 ? _a : null;
                        nm = (_b = u === null || u === void 0 ? void 0 : u.displayName) !== null && _b !== void 0 ? _b : null;
                        photo = (_c = u === null || u === void 0 ? void 0 : u.photoURL) !== null && _c !== void 0 ? _c : null;
                    }
                    if (!uid)
                        throw new Error('ensureUserDocument: uid missing');
                    userRef = (0, firestore_1.doc)(exports.db, 'users', uid);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(userRef)];
                case 1:
                    snap = _d.sent();
                    if (!!snap.exists()) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, firestore_1.setDoc)(userRef, {
                            uid: uid,
                            email: em,
                            name: nm,
                            photoUrl: photo,
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            updatedAt: (0, firestore_1.serverTimestamp)(),
                        })];
                case 2:
                    _d.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, firestore_1.updateDoc)(userRef, {
                        email: em,
                        name: nm,
                        photoUrl: photo,
                        lastLoginAt: (0, firestore_1.serverTimestamp)(),
                        updatedAt: (0, firestore_1.serverTimestamp)(),
                    })];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5: return [4 /*yield*/, (0, firestore_1.getDoc)(userRef)];
                case 6: return [2 /*return*/, _d.sent()];
            }
        });
    });
}
// Profile image upload
function uploadProfilePhoto(uid, file) {
    return __awaiter(this, void 0, void 0, function () {
        var r, task;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    r = (0, storage_1.ref)(exports.storage, "users/".concat(uid, "/profile.jpg"));
                    task = (0, storage_1.uploadBytesResumable)(r, file, { contentType: file.type || 'image/jpeg' });
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            task.on('state_changed', undefined, reject, function () { return resolve(); });
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, storage_1.getDownloadURL)(r)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Save or update profile and mark profile complete
function saveUserProfile(uid, data) {
    return __awaiter(this, void 0, void 0, function () {
        var userRef, snap, cleaned;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userRef = (0, firestore_1.doc)(exports.db, 'users', uid);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(userRef)];
                case 1:
                    snap = _a.sent();
                    cleaned = __assign({}, data);
                    if (typeof cleaned.instagramId === 'string') {
                        cleaned.instagramId = cleaned.instagramId.replace(/^@/, '').trim();
                    }
                    if (!!snap.exists()) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, firestore_1.setDoc)(userRef, __assign(__assign({ uid: uid }, cleaned), { isProfileComplete: true, createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, firestore_1.updateDoc)(userRef, __assign(__assign({}, cleaned), { isProfileComplete: true, updatedAt: (0, firestore_1.serverTimestamp)() }))];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Cloud Function callables
function callJoinMatchingRound(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var fn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fn = (0, functions_1.httpsCallable)(exports.functions, 'joinMatchingRound');
                    return [4 /*yield*/, fn(payload)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function callConfirmMatch(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var fn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fn = (0, functions_1.httpsCallable)(exports.functions, 'confirmMatch');
                    return [4 /*yield*/, fn(payload)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function callAdminPromoteMatch(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var fn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fn = (0, functions_1.httpsCallable)(exports.functions, 'adminPromoteMatch');
                    return [4 /*yield*/, fn(payload)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function callAdminApprovePayment(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var fn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fn = (0, functions_1.httpsCallable)(exports.functions, 'adminApprovePayment');
                    return [4 /*yield*/, fn(payload)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
