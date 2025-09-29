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
exports.default = PlansAdmin;
var react_1 = require("react");
var AdminGuard_1 = require("./AdminGuard");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../firebase");
var AdminHeader_1 = require("../../components/admin/AdminHeader");
function PlansAdmin() {
    var _a = (0, react_1.useState)([]), plans = _a[0], setPlans = _a[1];
    var _b = (0, react_1.useState)(''), name = _b[0], setName = _b[1];
    var _c = (0, react_1.useState)(49), price = _c[0], setPrice = _c[1];
    var _d = (0, react_1.useState)(1), matchQuota = _d[0], setMatchQuota = _d[1];
    var _e = (0, react_1.useState)(''), offersText = _e[0], setOffersText = _e[1];
    var _f = (0, react_1.useState)(false), supportAvailable = _f[0], setSupportAvailable = _f[1];
    var _g = (0, react_1.useState)(true), active = _g[0], setActive = _g[1];
    var _h = (0, react_1.useState)(false), saving = _h[0], setSaving = _h[1];
    function load() {
        return __awaiter(this, void 0, void 0, function () {
            var snap;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'plans'))];
                    case 1:
                        snap = _a.sent();
                        setPlans(snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); }));
                        return [2 /*return*/];
                }
            });
        });
    }
    (0, react_1.useEffect)(function () { load(); }, []);
    function toSlug(s) {
        return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    function createPlan(e) {
        return __awaiter(this, void 0, void 0, function () {
            var id, offers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        e.preventDefault();
                        if (!name.trim())
                            return [2 /*return*/];
                        setSaving(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 5]);
                        id = toSlug(name);
                        offers = offersText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
                        return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'plans', id), {
                                name: name,
                                price: price,
                                matchQuota: matchQuota,
                                offers: offers,
                                supportAvailable: supportAvailable,
                                active: active,
                                createdAt: new Date(), updatedAt: new Date(),
                            }, { merge: true })];
                    case 2:
                        _a.sent();
                        setName('');
                        setOffersText('');
                        setPrice(49);
                        setMatchQuota(1);
                        setSupportAvailable(false);
                        setActive(true);
                        return [4 /*yield*/, load()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        setSaving(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    function toggleActive(p) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'plans', p.id), { active: !p.active, updatedAt: new Date() })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, load()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function removePlan(p) {
        return __awaiter(this, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ok = window.confirm("Remove plan \"".concat(p.name, "\"? This does not affect existing subscriptions but users won't see this plan anymore."));
                        if (!ok)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebase_1.db, 'plans', p.id))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, load()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    return (<AdminGuard_1.default>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 900 }}>
          <AdminHeader_1.default current="plans"/>
          <h2>Plans</h2>

          <form className="stack" onSubmit={createPlan} style={{ gap: 10, marginTop: 12 }}>
            <div className="row" style={{ gap: 12, width: '100%', flexWrap: 'wrap' }}>
              <div className="stack" style={{ minWidth: 220, flex: 1 }}>
                <label style={{ fontWeight: 600 }}>Plan name</label>
                <input className="input" placeholder="e.g., Starter" value={name} onChange={function (e) { return setName(e.target.value); }}/>
              </div>
              <div className="stack" style={{ minWidth: 160 }}>
                <label style={{ fontWeight: 600 }}>Price (₹)</label>
                <input className="input" type="number" placeholder="Price" value={price} onChange={function (e) { return setPrice(Number(e.target.value || 0)); }}/>
              </div>
              <div className="stack" style={{ minWidth: 160 }}>
                <label style={{ fontWeight: 600 }}>Match quota</label>
                <input className="input" type="number" placeholder="Match quota" value={matchQuota} onChange={function (e) { return setMatchQuota(Number(e.target.value || 0)); }}/>
              </div>
            </div>

            <div className="stack">
              <label style={{ fontWeight: 600 }}>Offers</label>
              <textarea className="input" placeholder="One offer per line" rows={4} value={offersText} onChange={function (e) { return setOffersText(e.target.value); }}/>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <label><input type="checkbox" checked={supportAvailable} onChange={function (e) { return setSupportAvailable(e.target.checked); }}/> Support available</label>
              <label><input type="checkbox" checked={active} onChange={function (e) { return setActive(e.target.checked); }}/> Active</label>
            </div>

            <div>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create/Update Plan'}</button>
            </div>
          </form>

          <div className="stack" style={{ marginTop: 24 }}>
            {plans.map(function (p) {
            var _a;
            return (<div key={p.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <b>{p.name}</b> {p.active ? <span style={{ color: '#22c55e', marginLeft: 6 }}>(Active)</span> : <span style={{ color: '#ef4444', marginLeft: 6 }}>(Inactive)</span>}
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                      ₹{p.price} • Quota: {p.matchQuota} • {p.supportAvailable ? 'Support included' : 'No support'}
                    </div>
                    {((_a = p.offers) === null || _a === void 0 ? void 0 : _a.length) ? <ul style={{ margin: '6px 0 0 18px' }}>{p.offers.map(function (o) { return <li key={o}>{o}</li>; })}</ul> : null}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn" onClick={function () { return toggleActive(p); }}>{p.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-ghost" onClick={function () { return removePlan(p); }}>Remove</button>
                  </div>
                </div>
              </div>);
        })}
            {plans.length === 0 ? <div className="muted">No plans created yet.</div> : null}
          </div>
        </div>
      </div>
    </AdminGuard_1.default>);
}
