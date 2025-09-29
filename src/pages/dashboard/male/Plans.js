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
exports.default = MalePlans;
var Navbar_1 = require("../../../components/Navbar");
var MaleTabs_1 = require("../../../components/MaleTabs");
var AuthContext_1 = require("../../../state/AuthContext");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../../firebase");
var sonner_1 = require("sonner");
var subscriptions_1 = require("../../../services/subscriptions");
function slug(s) {
    return (s || '')
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-') // spaces/underscores → hyphen
        .replace(/[^a-z0-9-]/g, ''); // drop other punctuation
}
function MalePlans() {
    var _this = this;
    var _a, _b, _c;
    var user = (0, AuthContext_1.useAuth)().user;
    var nav = (0, react_router_dom_1.useNavigate)();
    var _d = (0, react_1.useState)([]), plans = _d[0], setPlans = _d[1];
    var _e = (0, react_1.useState)(null), sub = _e[0], setSub = _e[1];
    var _f = (0, react_1.useState)(true), loading = _f[0], setLoading = _f[1];
    // slug(planId) -> latest status
    var _g = (0, react_1.useState)({}), paymentStatusByPlan = _g[0], setPaymentStatusByPlan = _g[1];
    (0, react_1.useEffect)(function () {
        var run = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, pl, s, e_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        setLoading(true);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, Promise.all([
                                (0, subscriptions_1.listActivePlans)(),
                                user ? (0, subscriptions_1.getActiveSubscription)(user.uid) : Promise.resolve(null),
                            ])];
                    case 2:
                        _a = _c.sent(), pl = _a[0], s = _a[1];
                        setPlans(pl);
                        setSub(s);
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _c.sent();
                        sonner_1.toast.error((_b = e_1.message) !== null && _b !== void 0 ? _b : 'Failed to load plans');
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        run();
    }, [user]);
    (0, react_1.useEffect)(function () {
        if (!user)
            return;
        var qy = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'payments'), (0, firestore_1.where)('uid', '==', user.uid));
        var un = (0, firestore_1.onSnapshot)(qy, function (snap) {
            var latestByPlan = {};
            snap.forEach(function (doc) {
                var _a, _b, _c, _d;
                var d = doc.data();
                var rawId = (d.planId || '');
                if (!rawId)
                    return;
                var key = slug(rawId);
                var status = ((_a = d.status) !== null && _a !== void 0 ? _a : 'pending');
                var ts = (_d = (_c = (_b = d.updatedAt) === null || _b === void 0 ? void 0 : _b.toMillis) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _d !== void 0 ? _d : Date.now();
                if (!latestByPlan[key] || ts > latestByPlan[key].ts) {
                    latestByPlan[key] = { status: status, ts: ts };
                }
            });
            var out = {};
            Object.keys(latestByPlan).forEach(function (k) { return (out[k] = latestByPlan[k].status); });
            setPaymentStatusByPlan(out);
        });
        return function () { return un(); };
    }, [user]);
    var choose = function (p) {
        nav("/pay?planId=".concat(encodeURIComponent(p.id), "&amount=").concat(Number(p.price || p.amount || 0)));
    };
    var statusChip = function (planId) {
        var st = paymentStatusByPlan[slug(planId)];
        if (!st)
            return null;
        if (st === 'pending')
            return <span className="tag" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>;
        if (st === 'approved')
            return <span className="tag" style={{ background: '#DCFCE7', color: '#166534' }}>Confirmed</span>;
        if (st === 'rejected')
            return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Rejected</span>;
        if (st === 'failed')
            return <span className="tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Failed</span>;
        return null;
    };
    return (<>
      <Navbar_1.default />
      <div className="container">
        <MaleTabs_1.default />

        {sub ? (<div className="banner" style={{ marginBottom: 16 }}>
            Current plan: <b>{(_b = (_a = sub.plan) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : sub.planId}</b> • Remaining matches: <b>{sub.remainingMatches}</b>
            {((_c = sub.plan) === null || _c === void 0 ? void 0 : _c.supportAvailable) ? <span style={{ marginLeft: 12 }}>Support included</span> : null}
            <button className="btn primary" style={{ marginLeft: 12 }} onClick={function () { return nav('/dashboard/matches'); }}>
              Go to Matches
            </button>
          </div>) : (<div className="banner ghost" style={{ marginBottom: 16 }}>
            No active plan. Choose a plan below to join the next round.
          </div>)}

        <h2>Available Plans</h2>
        {loading ? (<div>Loading…</div>) : plans.length === 0 ? (<div className="empty">No active plans right now. Please check back later.</div>) : (<div className="grid cols-3">
            {plans.map(function (p) {
                var _a, _b, _c, _d, _e;
                var st = paymentStatusByPlan[slug(p.id)];
                var isPending = st === 'pending';
                var isApproved = st === 'approved';
                return (<div key={p.id} className="card plan">
                  <div className="card-body">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>{p.name}</h3>
                      {statusChip(p.id)}
                    </div>
                    <div className="price">₹{(_a = p.price) !== null && _a !== void 0 ? _a : p.amount}</div>
                    <p className="muted">Includes {((_c = (_b = p.matchQuota) !== null && _b !== void 0 ? _b : p.quota) !== null && _c !== void 0 ? _c : 1)} match{((_e = (_d = p.matchQuota) !== null && _d !== void 0 ? _d : p.quota) !== null && _e !== void 0 ? _e : 1) > 1 ? 'es' : ''}</p>
                    {Array.isArray(p.offers) && p.offers.length ? (<ul style={{ marginLeft: 16 }}>
                        {p.offers.map(function (o) { return (<li key={o}>{o}</li>); })}
                      </ul>) : null}
                    {p.supportAvailable ? <div className="tag" style={{ marginTop: 8 }}>Support included</div> : null}
                  </div>
                  <div className="card-footer">
                    {isApproved ? (<button className="btn" onClick={function () { return nav('/dashboard/matches'); }}>Go to Matches</button>) : (<button className="btn btn-primary" onClick={function () { return choose(p); }} disabled={isPending}>
                        {isPending ? 'Awaiting approval' : 'Choose plan'}
                      </button>)}
                  </div>
                </div>);
            })}
          </div>)}
      </div>
    </>);
}
