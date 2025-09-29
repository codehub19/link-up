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
exports.getMaleCandidatesForFemale = getMaleCandidatesForFemale;
var rounds_1 = require("./rounds");
var assignments_1 = require("./assignments");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../firebase");
function getMaleCandidatesForFemale(femaleUid) {
    return __awaiter(this, void 0, void 0, function () {
        var active, a, uids, profiles_1, _i, _a, uid, u, roundSnap, list, profiles, _b, _c, uid, u;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, rounds_1.getActiveRound)()];
                case 1:
                    active = _e.sent();
                    if (!active)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, (0, assignments_1.getAssignments)(active.id, femaleUid)];
                case 2:
                    a = _e.sent();
                    uids = ((a === null || a === void 0 ? void 0 : a.maleCandidates) || []);
                    if (!(uids.length > 0)) return [3 /*break*/, 7];
                    profiles_1 = [];
                    _i = 0, _a = uids.slice(0, 50);
                    _e.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    uid = _a[_i];
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid))];
                case 4:
                    u = _e.sent();
                    if (u.exists())
                        profiles_1.push(__assign({ uid: uid }, u.data()));
                    _e.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/, profiles_1];
                case 7: return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'matchingRounds', active.id))];
                case 8:
                    roundSnap = _e.sent();
                    list = ((_d = roundSnap.data()) === null || _d === void 0 ? void 0 : _d.participatingMales) || [];
                    profiles = [];
                    _b = 0, _c = list.slice(0, 50);
                    _e.label = 9;
                case 9:
                    if (!(_b < _c.length)) return [3 /*break*/, 12];
                    uid = _c[_b];
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid))];
                case 10:
                    u = _e.sent();
                    if (u.exists())
                        profiles.push(__assign({ uid: uid }, u.data()));
                    _e.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12: return [2 /*return*/, profiles];
            }
        });
    });
}
