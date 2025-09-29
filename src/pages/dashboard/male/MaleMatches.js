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
exports.default = MaleMatches;
var Navbar_1 = require("../../../components/Navbar");
var AuthContext_1 = require("../../../state/AuthContext");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../../firebase");
var react_1 = require("react");
var sonner_1 = require("sonner");
var MaleTabs_1 = require("../../../components/MaleTabs");
var ProfileMiniCard_1 = require("../../../components/ProfileMiniCard");
var Carousel_1 = require("../../../components/Carousel");
var entitlements_1 = require("../../../services/entitlements");
var react_router_dom_1 = require("react-router-dom");
function MaleMatches() {
    var _this = this;
    var user = (0, AuthContext_1.useAuth)().user;
    var nav = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)([]), likes = _a[0], setLikes = _a[1];
    var _b = (0, react_1.useState)({}), girls = _b[0], setGirls = _b[1];
    var _c = (0, react_1.useState)([]), matches = _c[0], setMatches = _c[1];
    var _d = (0, react_1.useState)(0), remaining = _d[0], setRemaining = _d[1];
    var confirmedGirlIds = (0, react_1.useMemo)(function () { return new Set(matches.map(function (m) { return m.girlUid; })); }, [matches]);
    (0, react_1.useEffect)(function () {
        if (!user)
            return;
        var run = function () { return __awaiter(_this, void 0, void 0, function () {
            var ent, likesQ, likeSnaps, ls, girlsNeeded, usersSnaps, gmap, _i, usersSnaps_1, d, data, matchSnaps, ms;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, entitlements_1.getMaleEntitlement)(user.uid)];
                    case 1:
                        ent = _b.sent();
                        setRemaining((_a = ent.remainingMatches) !== null && _a !== void 0 ? _a : 0);
                        likesQ = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'likes'), (0, firestore_1.where)('likedUserUid', '==', user.uid));
                        return [4 /*yield*/, (0, firestore_1.getDocs)(likesQ)];
                    case 2:
                        likeSnaps = _b.sent();
                        ls = likeSnaps.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                        girlsNeeded = Array.from(new Set(ls.map(function (l) { return l.likingUserUid; })));
                        return [4 /*yield*/, Promise.all(girlsNeeded.map(function (uid) { return __awaiter(_this, void 0, void 0, function () {
                                var r;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'users'), (0, firestore_1.where)('uid', '==', uid)))];
                                        case 1:
                                            r = _a.sent();
                                            return [2 /*return*/, r.docs[0]];
                                    }
                                });
                            }); }))];
                    case 3:
                        usersSnaps = _b.sent();
                        gmap = {};
                        for (_i = 0, usersSnaps_1 = usersSnaps; _i < usersSnaps_1.length; _i++) {
                            d = usersSnaps_1[_i];
                            if (d) {
                                data = d.data();
                                gmap[data.uid] = data;
                            }
                        }
                        return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'matches'), (0, firestore_1.where)('participants', 'array-contains', user.uid)))];
                    case 4:
                        matchSnaps = _b.sent();
                        ms = matchSnaps.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                        setLikes(ls);
                        setGirls(gmap);
                        setMatches(ms);
                        return [2 /*return*/];
                }
            });
        }); };
        run();
    }, [user]);
    var confirm = function (like) { return __awaiter(_this, void 0, void 0, function () {
        var matchSnaps, ms, ent, e_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, (0, firebase_1.callConfirmMatch)({ roundId: like.roundId, girlUid: like.likingUserUid })];
                case 1:
                    _c.sent();
                    sonner_1.toast.success('Connection revealed to both of you!');
                    return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'matches'), (0, firestore_1.where)('participants', 'array-contains', user.uid)))];
                case 2:
                    matchSnaps = _c.sent();
                    ms = matchSnaps.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                    setMatches(ms);
                    return [4 /*yield*/, (0, entitlements_1.getMaleEntitlement)(user.uid)];
                case 3:
                    ent = _c.sent();
                    setRemaining((_a = ent.remainingMatches) !== null && _a !== void 0 ? _a : 0);
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _c.sent();
                    sonner_1.toast.error((_b = e_1.message) !== null && _b !== void 0 ? _b : 'Failed to confirm match');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var pendingLikes = likes.filter(function (l) { return !confirmedGirlIds.has(l.likingUserUid); });
    return (<>
      <Navbar_1.default />
      <div className="container">
        <MaleTabs_1.default />

        <div className={"banner ".concat(remaining === 0 ? 'ghost' : '')} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          Remaining matches: <b>{remaining}</b>
          {remaining === 0 ? (<button className="btn btn-primary" onClick={function () { return nav('/dashboard/plans'); }}>Buy again</button>) : null}
        </div>

        <h2>My Matches</h2>

        <h3 style={{ marginTop: 12 }}>Pending Likes</h3>
        {pendingLikes.length === 0 ? (<div className="empty">No matches yet. When a girl likes your profile from a matching round, she will appear here.</div>) : (<Carousel_1.default>
            {pendingLikes.map(function (l) {
                var g = girls[l.likingUserUid];
                return (<ProfileMiniCard_1.default key={l.id} photoUrl={g === null || g === void 0 ? void 0 : g.photoUrl} 
                // Hide identity until confirmed
                name="Hidden until matched" instagramId={undefined} bio={g === null || g === void 0 ? void 0 : g.bio} interests={g === null || g === void 0 ? void 0 : g.interests} footer={<button className="btn primary" onClick={function () { return confirm(l); }} disabled={remaining <= 0}>
                      {remaining <= 0 ? 'Quota used' : 'Select & Reveal'}
                    </button>}/>);
            })}
          </Carousel_1.default>)}

        <h3 style={{ marginTop: 24 }}>Confirmed</h3>
        {matches.length === 0 ? (<div className="empty">No confirmed connections yet.</div>) : (<Carousel_1.default>
            {matches.map(function (m) {
                var g = girls[m.girlUid];
                if (!g)
                    return null;
                return (<ProfileMiniCard_1.default key={m.id} photoUrl={g.photoUrl} 
                // After confirmation, reveal identity
                name={g.name} instagramId={g.instagramId} bio={g.bio} interests={g.interests}/>);
            })}
          </Carousel_1.default>)}
      </div>
    </>);
}
