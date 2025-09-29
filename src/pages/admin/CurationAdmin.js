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
exports.default = CurationAdmin;
var react_1 = require("react");
var AdminGuard_1 = require("./AdminGuard");
var rounds_1 = require("../../services/rounds");
var admin_1 = require("../../services/admin");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../firebase");
var assignments_1 = require("../../services/assignments");
var likes_1 = require("../../services/likes");
var firebase_2 = require("../../firebase");
var AdminHeader_1 = require("../../components/admin/AdminHeader");
function CurationAdmin() {
    var _this = this;
    var _a = (0, react_1.useState)(null), activeRound = _a[0], setActiveRound = _a[1];
    var _b = (0, react_1.useState)([]), girls = _b[0], setGirls = _b[1];
    var _c = (0, react_1.useState)(''), filter = _c[0], setFilter = _c[1];
    var _d = (0, react_1.useState)(null), selectedGirl = _d[0], setSelectedGirl = _d[1];
    var _e = (0, react_1.useState)([]), verifiedMales = _e[0], setVerifiedMales = _e[1];
    var _f = (0, react_1.useState)([]), assigned = _f[0], setAssigned = _f[1];
    var _g = (0, react_1.useState)([]), likes = _g[0], setLikes = _g[1];
    var _h = (0, react_1.useState)([]), likedMales = _h[0], setLikedMales = _h[1];
    var roundId = activeRound === null || activeRound === void 0 ? void 0 : activeRound.id;
    (0, react_1.useEffect)(function () {
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var r, roundSnap, males, profiles, _i, males_1, uid, u, gs;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, rounds_1.getActiveRound)()];
                    case 1:
                        r = _b.sent();
                        setActiveRound(r);
                        if (!r) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'matchingRounds', r.id))];
                    case 2:
                        roundSnap = _b.sent();
                        males = ((_a = roundSnap.data()) === null || _a === void 0 ? void 0 : _a.participatingMales) || [];
                        profiles = [];
                        _i = 0, males_1 = males;
                        _b.label = 3;
                    case 3:
                        if (!(_i < males_1.length)) return [3 /*break*/, 6];
                        uid = males_1[_i];
                        return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid))];
                    case 4:
                        u = _b.sent();
                        if (u.exists())
                            profiles.push(__assign({ uid: uid }, u.data()));
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        setVerifiedMales(profiles);
                        _b.label = 7;
                    case 7: return [4 /*yield*/, (0, admin_1.listFemaleUsers)()];
                    case 8:
                        gs = _b.sent();
                        setGirls(gs);
                        return [2 /*return*/];
                }
            });
        }); })();
    }, []);
    (0, react_1.useEffect)(function () {
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var a, l, uniqueBoyUids, likedProfiles, _i, uniqueBoyUids_1, uid, u;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!roundId || !selectedGirl) {
                            setAssigned([]);
                            setLikes([]);
                            setLikedMales([]);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, assignments_1.getAssignments)(roundId, selectedGirl.uid)];
                    case 1:
                        a = _a.sent();
                        setAssigned(a.maleCandidates || []);
                        return [4 /*yield*/, (0, likes_1.listLikesByGirl)(roundId, selectedGirl.uid)];
                    case 2:
                        l = _a.sent();
                        setLikes(l);
                        uniqueBoyUids = Array.from(new Set((l || []).map(function (x) { return x.likedUserUid; })));
                        likedProfiles = [];
                        _i = 0, uniqueBoyUids_1 = uniqueBoyUids;
                        _a.label = 3;
                    case 3:
                        if (!(_i < uniqueBoyUids_1.length)) return [3 /*break*/, 6];
                        uid = uniqueBoyUids_1[_i];
                        return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid))];
                    case 4:
                        u = _a.sent();
                        if (u.exists())
                            likedProfiles.push(__assign({ uid: uid }, u.data()));
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        setLikedMales(likedProfiles);
                        return [2 /*return*/];
                }
            });
        }); })();
    }, [roundId, selectedGirl]);
    function persistAssignments() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!roundId || !selectedGirl)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, assignments_1.setAssignments)(roundId, selectedGirl.uid, assigned)];
                    case 1:
                        _a.sent();
                        alert('Assignments saved');
                        return [2 /*return*/];
                }
            });
        });
    }
    function promoteLike(maleUid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!roundId || !selectedGirl)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, firebase_2.callAdminPromoteMatch)({ roundId: roundId, boyUid: maleUid, girlUid: selectedGirl.uid })];
                    case 1:
                        _a.sent();
                        alert('Match created');
                        return [2 /*return*/];
                }
            });
        });
    }
    var assignedSet = (0, react_1.useMemo)(function () { return new Set(assigned); }, [assigned]);
    var filteredGirls = (0, react_1.useMemo)(function () { return girls.filter(function (g) {
        return (g.name || '').toLowerCase().includes(filter.toLowerCase()) ||
            (g.instagramId || '').toLowerCase().includes(filter.toLowerCase());
    }); }, [girls, filter]);
    return (<AdminGuard_1.default>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 1300 }}>
          <AdminHeader_1.default current="curation"/>
          <h2 style={{ marginTop: 0 }}>Round Curation</h2>
          {!activeRound ? <p>No active round</p> : <p style={{ color: 'var(--muted)' }}>Active round: <b>{roundId}</b></p>}

          <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: 16, width: 340, maxHeight: 560, overflow: 'auto' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b>Girls</b>
                <input className="input" placeholder="Search by name or insta" style={{ maxWidth: 180 }} value={filter} onChange={function (e) { return setFilter(e.target.value); }}/>
              </div>
              <div className="stack">
                {filteredGirls.map(function (g) { return (<button key={g.uid} className={"btn ".concat((selectedGirl === null || selectedGirl === void 0 ? void 0 : selectedGirl.uid) === g.uid ? 'btn-primary' : 'btn-ghost')} onClick={function () { return setSelectedGirl(function (prev) { return (prev === null || prev === void 0 ? void 0 : prev.uid) === g.uid ? null : g; }); }} style={{ justifyContent: 'flex-start' }}>
                    <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 28, height: 28, borderRadius: 999, overflow: 'hidden', background: '#f3f3f3' }}>
                        {g.photoUrl ? <img src={g.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : null}
                      </div>
                      <div>
                        <div>{g.name || g.uid}</div>
                        <small style={{ color: 'var(--muted)' }}>@{g.instagramId}</small>
                      </div>
                    </div>
                  </button>); })}
              </div>
            </div>

            <div className="card" style={{ padding: 16, flex: 1, minWidth: 420 }}>
              {!selectedGirl ? <p>Select a girl to curate</p> : (<>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 56, height: 56, borderRadius: 999, overflow: 'hidden', background: '#f3f3f3' }}>
                        {selectedGirl.photoUrl ? <img src={selectedGirl.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : null}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{selectedGirl.name || selectedGirl.uid}</div>
                        <div style={{ color: 'var(--muted)' }}>@{selectedGirl.instagramId} {selectedGirl.college ? "\u2022 ".concat(selectedGirl.college) : ''}</div>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={persistAssignments}>Save assignments</button>
                  </div>

                  <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                    <div className="card" style={{ padding: 12, flex: 1, minWidth: 320 }}>
                      <b>Approved males (toggle to assign)</b>
                      <div className="grid cols-2" style={{ gap: 8, marginTop: 8 }}>
                        {verifiedMales.map(function (m) {
                var _a;
                return (<div key={m.uid} className={"card ".concat(assignedSet.has(m.uid) ? 'selected' : '')} style={{ padding: 10 }}>
                            <div className="row" style={{ gap: 10 }}>
                              <div className="avatar" style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                                {m.photoUrl ? <img src={m.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : null}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{m.name || m.uid}</div>
                                <small style={{ color: 'var(--muted)' }}>@{m.instagramId}{m.college ? " \u2022 ".concat(m.college) : ''}</small>
                                {m.bio ? <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}>{m.bio}</div> : null}
                                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                  {((_a = m.interests) !== null && _a !== void 0 ? _a : []).slice(0, 4).map(function (i) { return <span key={i} className="tag">{i}</span>; })}
                                </div>
                              </div>
                              <div>
                                <input type="checkbox" checked={assignedSet.has(m.uid)} onChange={function () {
                        setAssigned(function (prev) { return assignedSet.has(m.uid) ? prev.filter(function (x) { return x !== m.uid; }) : __spreadArray(__spreadArray([], prev, true), [m.uid], false); });
                    }}/>
                              </div>
                            </div>
                          </div>);
            })}
                        {verifiedMales.length === 0 ? <div style={{ color: 'var(--muted)' }}>No approved males yet.</div> : null}
                      </div>
                    </div>

                    <div className="card" style={{ padding: 12, flex: 1, minWidth: 320 }}>
                      <b>Girl’s likes (this round)</b>
                      <div className="grid cols-2" style={{ gap: 8, marginTop: 8 }}>
                        {likedMales.map(function (m) { return (<div key={m.uid} className="card" style={{ padding: 10 }}>
                            <div className="row" style={{ gap: 10 }}>
                              <div className="avatar" style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                                {m.photoUrl ? <img src={m.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : null}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{m.name || m.uid}</div>
                                <small style={{ color: 'var(--muted)' }}>@{m.instagramId}{m.college ? " \u2022 ".concat(m.college) : ''}</small>
                              </div>
                              <div>
                                <button className="btn btn-primary" onClick={function () { return promoteLike(m.uid); }}>Promote</button>
                              </div>
                            </div>
                          </div>); })}
                        {likedMales.length === 0 ? <div style={{ color: 'var(--muted)' }}>No likes yet.</div> : null}
                      </div>
                    </div>
                  </div>
                </>)}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard_1.default>);
}
