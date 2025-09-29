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
exports.default = PaymentsAdmin;
var react_1 = require("react");
var AdminGuard_1 = require("./AdminGuard");
var payments_1 = require("../../services/payments");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../firebase");
var AdminHeader_1 = require("../../components/admin/AdminHeader");
function PaymentsAdmin() {
    var _this = this;
    var _a = (0, react_1.useState)([]), rows = _a[0], setRows = _a[1];
    var _b = (0, react_1.useState)(false), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(null), busyId = _c[0], setBusyId = _c[1];
    var _d = (0, react_1.useState)(''), search = _d[0], setSearch = _d[1];
    function approve(paymentId) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setBusyId(paymentId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, (0, payments_1.approveAndProvisionPayment)(paymentId)];
                    case 2:
                        _a.sent();
                        alert('Approved and subscription provisioned');
                        return [4 /*yield*/, refresh()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        e_1 = _a.sent();
                        console.error('approve error', e_1);
                        alert((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || 'Failed to approve');
                        return [3 /*break*/, 6];
                    case 5:
                        setBusyId(null);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    function refresh() {
        return __awaiter(this, void 0, void 0, function () {
            var pending, enriched;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 5]);
                        return [4 /*yield*/, (0, payments_1.listPendingPayments)()];
                    case 2:
                        pending = _a.sent();
                        return [4 /*yield*/, Promise.all(pending.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                                var u, udata;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', p.uid))];
                                        case 1:
                                            u = _a.sent();
                                            udata = u.data() || {};
                                            return [2 /*return*/, __assign(__assign({}, p), { userName: (udata === null || udata === void 0 ? void 0 : udata.name) || 'User', gender: (udata === null || udata === void 0 ? void 0 : udata.gender) || '-', instagramId: (udata === null || udata === void 0 ? void 0 : udata.instagramId) || '' })];
                                    }
                                });
                            }); }))];
                    case 3:
                        enriched = _a.sent();
                        setRows(enriched);
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    (0, react_1.useEffect)(function () { refresh(); }, []);
    var filtered = rows.filter(function (p) {
        return (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.instagramId || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.planId || '').toLowerCase().includes(search.toLowerCase());
    });
    return (<AdminGuard_1.default>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 1000 }}>
          <AdminHeader_1.default current="payments"/>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0 }}>Payments (Pending)</h2>
            <input className="input" placeholder="Search name/insta/plan…" value={search} onChange={function (e) { return setSearch(e.target.value); }} style={{ maxWidth: 260 }}/>
          </div>
          {loading ? <p>Loading…</p> : null}
          <div className="stack">
            {filtered.map(function (p) { return (<div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div><b>{p.userName}</b> • {p.gender} {p.instagramId ? <span className="muted">(@{p.instagramId})</span> : null}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                      Plan: {p.planId} • Amount: ₹{p.amount} • UPI: {p.upiId}
                    </div>
                    {p.proofUrl ? (<div style={{ marginTop: 6 }}>
                        <a href={p.proofUrl} target="_blank" rel="noreferrer">View proof</a>
                      </div>) : null}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary" disabled={busyId === p.id} onClick={function () { return approve(p.id); }}>
                      {busyId === p.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button className="btn btn-ghost" disabled={busyId === p.id} onClick={function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, payments_1.rejectPayment)(p.id)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, refresh()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        }); }); }}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>); })}
            {filtered.length === 0 && !loading ? <p style={{ color: 'var(--muted)' }}>No pending payments.</p> : null}
          </div>
        </div>
      </div>
    </AdminGuard_1.default>);
}
