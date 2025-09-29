"use strict";
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
exports.useAuth = void 0;
exports.AuthProvider = AuthProvider;
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var react_1 = require("react");
var firebase_1 = require("../firebase");
var Ctx = (0, react_1.createContext)({});
function AuthProvider(_a) {
    var _this = this;
    var children = _a.children;
    var _b = (0, react_1.useState)(null), user = _b[0], setUser = _b[1];
    var _c = (0, react_1.useState)(null), profile = _c[0], setProfile = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    var fetchProfile = function (uid) { return __awaiter(_this, void 0, void 0, function () {
        var ref, snap;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ref = (0, firestore_1.doc)(firebase_1.db, 'users', uid);
                    return [4 /*yield*/, (0, firestore_1.getDoc)(ref)];
                case 1:
                    snap = _a.sent();
                    if (snap.exists())
                        setProfile(snap.data());
                    else
                        setProfile(null);
                    return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        var unsub = (0, auth_1.onAuthStateChanged)(firebase_1.auth, function (u) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setUser(u);
                        if (!u) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, firebase_1.ensureUserDocument)(u)]; // creates/updates users/{uid}
                    case 1:
                        _a.sent(); // creates/updates users/{uid}
                        return [4 /*yield*/, fetchProfile(u.uid)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        setProfile(null);
                        _a.label = 4;
                    case 4:
                        setLoading(false);
                        return [2 /*return*/];
                }
            });
        }); });
        return function () { return unsub(); };
    }, []);
    var value = (0, react_1.useMemo)(function () { return ({
        user: user,
        profile: profile,
        loading: loading,
        login: function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, u, isNewUser;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, firebase_1.signInWithGoogle)()];
                    case 1:
                        _a = _b.sent(), u = _a.user, isNewUser = _a.isNewUser;
                        return [4 /*yield*/, (0, firebase_1.ensureUserDocument)(u)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, fetchProfile(u.uid)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, isNewUser];
                }
            });
        }); },
        logout: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, firebase_1.signOut)()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        refreshProfile: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!firebase_1.auth.currentUser) return [3 /*break*/, 2];
                        return [4 /*yield*/, fetchProfile(firebase_1.auth.currentUser.uid)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); },
    }); }, [user, profile, loading]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
var useAuth = function () { return (0, react_1.useContext)(Ctx); };
exports.useAuth = useAuth;
