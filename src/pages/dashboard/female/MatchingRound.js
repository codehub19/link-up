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
exports.default = MatchingRound;
var Navbar_1 = require("../../../components/Navbar");
var react_1 = require("react");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../../firebase");
var AuthContext_1 = require("../../../state/AuthContext");
var sonner_1 = require("sonner");
var react_router_dom_1 = require("react-router-dom");
var ProfileMiniCard_1 = require("../../../components/ProfileMiniCard");
var Carousel_1 = require("../../../components/Carousel");
var likes_1 = require("../../../services/likes");
var rounds_1 = require("../../../services/rounds");
var assignments_1 = require("../../../services/assignments");
function MatchingRound() {
    var _this = this;
    var user = (0, AuthContext_1.useAuth)().user;
    var _a = (0, react_1.useState)(null), roundId = _a[0], setRoundId = _a[1];
    var _b = (0, react_1.useState)([]), assignedUids = _b[0], setAssignedUids = _b[1];
    var _c = (0, react_1.useState)([]), males = _c[0], setMales = _c[1];
    var _d = (0, react_1.useState)(new Set()), liked = _d[0], setLiked = _d[1];
    (0, react_1.useEffect)(function () {
        var run = function () { return __awaiter(_this, void 0, void 0, function () {
            var active;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, rounds_1.getActiveRound)()];
                    case 1:
                        active = _a.sent();
                        if (!active) {
                            setRoundId(null);
                            return [2 /*return*/];
                        }
                        setRoundId(active.id || active.roundId);
                        return [2 /*return*/];
                }
            });
        }); };
        run();
    }, []);
    (0, react_1.useEffect)(function () {
        var run = function () { return __awaiter(_this, void 0, void 0, function () {
            var a;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!roundId || !user) {
                            setAssignedUids([]);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, assignments_1.getAssignments)(roundId, user.uid)];
                    case 1:
                        a = _a.sent();
                        setAssignedUids(a.maleCandidates || []);
                        return [2 /*return*/];
                }
            });
        }); };
        run();
    }, [roundId, user]);
    (0, react_1.useEffect)(function () {
        var run = function () { return __awaiter(_this, void 0, void 0, function () {
            var users, _i, assignedUids_1, uid, s;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (assignedUids.length === 0) {
                            setMales([]);
                            return [2 /*return*/];
                        }
                        users = [];
                        _i = 0, assignedUids_1 = assignedUids;
                        _a.label = 1;
                    case 1:
                        if (!(_i < assignedUids_1.length)) return [3 /*break*/, 4];
                        uid = assignedUids_1[_i];
                        return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'users'), (0, firestore_1.where)('uid', '==', uid)))];
                    case 2:
                        s = _a.sent();
                        if (!s.empty)
                            users.push(s.docs[0].data());
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        setMales(users);
                        return [2 /*return*/];
                }
            });
        }); };
        run();
    }, [assignedUids]);
    (0, react_1.useEffect)(function () {
        var loadLiked = function () { return __awaiter(_this, void 0, void 0, function () {
            var ls, set;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!user || !roundId)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, likes_1.listLikesByGirl)(roundId, user.uid)];
                    case 1:
                        ls = _a.sent();
                        set = new Set(ls.map(function (l) { return l.likedUserUid; }));
                        setLiked(set);
                        return [2 /*return*/];
                }
            });
        }); };
        loadLiked();
    }, [user, roundId]);
    var like = function (boyUid) { return __awaiter(_this, void 0, void 0, function () {
        var newId, next, e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!user || !roundId)
                        return [2 /*return*/];
                    if (liked.has(boyUid))
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    newId = "".concat(roundId, "_").concat(user.uid, "_").concat(boyUid);
                    return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'likes', newId), {
                            roundId: roundId,
                            likingUserUid: user.uid,
                            likedUserUid: boyUid,
                            timestamp: new Date(),
                        })];
                case 2:
                    _b.sent();
                    next = new Set(liked);
                    next.add(boyUid);
                    setLiked(next);
                    sonner_1.toast.success('Liked!');
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    sonner_1.toast.error((_a = e_1.message) !== null && _a !== void 0 ? _a : 'Failed to like');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    if (roundId === null) {
        return (<>
        <Navbar_1.default />
        <div className="container">
          <h2>The next round is coming soon!</h2>
          <p className="muted">We’ll notify you when it’s live.</p>
          <react_router_dom_1.Link className="btn" to="/dashboard/connections">My Connections</react_router_dom_1.Link>
        </div>
      </>);
    }
    return (<>
      <Navbar_1.default />
      <div className="container">
        <div className="banner">Today’s picks curated just for you.</div>

        {assignedUids.length === 0 ? (<div className="empty">No profiles assigned to you yet. Please check back later.</div>) : males.length === 0 ? (<div className="empty">Loading assigned profiles…</div>) : (<Carousel_1.default>
            {males.map(function (m) { return (<ProfileMiniCard_1.default key={m.uid} photoUrl={m.photoUrl} 
            // Hide identity for the girl until match confirmed
            name="Hidden until matched" instagramId={undefined} bio={m.bio} interests={m.interests} footer={<button className={"btn ".concat(liked.has(m.uid) ? 'ghost' : 'primary')} onClick={function () { return like(m.uid); }} disabled={liked.has(m.uid)}>
                    {liked.has(m.uid) ? 'Liked' : 'Like'}
                  </button>}/>); })}
          </Carousel_1.default>)}

        <div style={{ marginTop: 24 }}>
          <react_router_dom_1.Link className="btn ghost" to="/dashboard/connections">My Connections</react_router_dom_1.Link>
        </div>
      </div>
    </>);
}
