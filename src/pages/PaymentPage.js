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
exports.default = PaymentPage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var AuthContext_1 = require("../state/AuthContext");
var payments_1 = require("../config/payments");
var payments_2 = require("../services/payments");
var Navbar_1 = require("../components/Navbar");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../firebase");
function PaymentPage() {
    var _this = this;
    var nav = (0, react_router_dom_1.useNavigate)();
    var user = (0, AuthContext_1.useAuth)().user;
    var sp = (0, react_router_dom_1.useSearchParams)()[0];
    var params = (0, react_router_dom_1.useParams)();
    var paramPlanId = (0, react_1.useMemo)(function () { return sp.get('planId') || params.planId || 'basic'; }, [sp, params]);
    var amountOverride = sp.get('amount');
    var _a = (0, react_1.useState)(null), resolvedPlan = _a[0], setResolvedPlan = _a[1];
    var _b = (0, react_1.useState)(null), proof = _b[0], setProof = _b[1];
    var _c = (0, react_1.useState)(false), submitting = _c[0], setSubmitting = _c[1];
    // Resolve plan from Firestore if not present in PLANS
    (0, react_1.useEffect)(function () {
        var local = payments_1.PLANS.find(function (p) { return p.id === paramPlanId; });
        if (local) {
            setResolvedPlan({ id: local.id, name: local.name, amount: local.amount });
            return;
        }
        // Try Firestore "plans/{planId}"
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var snap, d;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'plans', paramPlanId))];
                    case 1:
                        snap = _a.sent();
                        if (snap.exists()) {
                            d = snap.data();
                            setResolvedPlan({ id: snap.id, name: d.name || snap.id, amount: Number(d.price || d.amount || 0) });
                        }
                        else {
                            // Fallback to URL amount and id if admin plan not found (keeps flow working)
                            setResolvedPlan({
                                id: paramPlanId,
                                name: paramPlanId,
                                amount: Number(amountOverride || 0),
                            });
                        }
                        return [2 /*return*/];
                }
            });
        }); })();
    }, [paramPlanId, amountOverride]);
    function onConfirmPaid() {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!user) {
                            alert('Please login first');
                            return [2 /*return*/];
                        }
                        if (!resolvedPlan) {
                            alert('Plan not loaded yet');
                            return [2 /*return*/];
                        }
                        setSubmitting(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, (0, payments_2.createPayment)({
                                uid: user.uid,
                                planId: resolvedPlan.id, // IMPORTANT: store the exact plan id so status chips match
                                amount: amountOverride ? Number(amountOverride) : resolvedPlan.amount,
                                upiId: payments_1.UPI_ID,
                            }, proof || undefined)];
                    case 2:
                        _a.sent();
                        alert('Payment submitted. We will verify it shortly.');
                        nav('/dashboard/plans');
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        console.error(e_1);
                        alert((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || 'Failed to submit payment');
                        return [3 /*break*/, 5];
                    case 4:
                        setSubmitting(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    function copyUPI() {
        navigator.clipboard.writeText(payments_1.UPI_ID).then(function () {
            alert('UPI ID copied');
        }).catch(function () { });
    }
    if (!resolvedPlan) {
        return (<>
        <Navbar_1.default />
        <div className="container"><div className="card" style={{ maxWidth: 820, margin: '24px auto', padding: 24 }}>Loading…</div></div>
      </>);
    }
    var amount = amountOverride ? Number(amountOverride) : resolvedPlan.amount;
    return (<>
      <Navbar_1.default />
      <div className="container">
        <div className="card" style={{ maxWidth: 820, margin: '24px auto', padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Complete Payment</h2>
          <p style={{ marginTop: 6, color: 'var(--muted)' }}>Plan: <b>{resolvedPlan.name}</b> • Amount: <b>₹{amount}</b></p>

          <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 16 }}>
            <div className="stack" style={{ minWidth: 260 }}>
              <img src={payments_1.UPI_QR_URL} alt="UPI QR" style={{ width: 260, height: 260, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--card-border)' }}/>
              <small style={{ color: 'var(--muted)' }}>Scan the QR with your UPI app</small>
            </div>

            <div className="stack" style={{ flex: 1, minWidth: 260 }}>
              <label style={{ fontWeight: 600 }}>UPI ID</label>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" readOnly value={payments_1.UPI_ID}/>
                <button type="button" className="btn btn-primary" onClick={copyUPI}>Copy</button>
              </div>

              <div className="stack" style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600 }}>Payment screenshot (optional)</label>
                <input className="input" type="file" accept="image/*" onChange={function (e) { var _a; return setProof(((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) || null); }}/>
                <small style={{ color: 'var(--muted)' }}>Attach proof to speed up approval.</small>
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-primary" onClick={onConfirmPaid} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'I have paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>);
}
