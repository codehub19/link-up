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
exports.default = AdminLogin;
var react_1 = require("react");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../firebase");
var react_router_dom_1 = require("react-router-dom");
function AdminLogin() {
    var nav = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)(''), email = _a[0], setEmail = _a[1];
    var _b = (0, react_1.useState)(''), password = _b[0], setPassword = _b[1];
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(null), error = _d[0], setError = _d[1];
    function onSubmit(e) {
        return __awaiter(this, void 0, void 0, function () {
            var auth, cred, u, snap, isAdmin, e_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        e.preventDefault();
                        setError(null);
                        setLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 8]);
                        auth = (0, auth_1.getAuth)();
                        return [4 /*yield*/, (0, auth_1.signInWithEmailAndPassword)(auth, email.trim(), password)];
                    case 2:
                        cred = _b.sent();
                        u = cred.user;
                        return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', u.uid))];
                    case 3:
                        snap = _b.sent();
                        isAdmin = snap.exists() && ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.isAdmin) === true;
                        if (!!isAdmin) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, auth_1.signOut)(auth)];
                    case 4:
                        _b.sent();
                        throw new Error('Not an admin account');
                    case 5:
                        nav('/admin/rounds');
                        return [3 /*break*/, 8];
                    case 6:
                        e_1 = _b.sent();
                        setError((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || 'Login failed');
                        return [3 /*break*/, 8];
                    case 7:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="container">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={function (e) { return setEmail(e.target.value); }} required/>
          </div>
          <div>
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={function (e) { return setPassword(e.target.value); }} required/>
          </div>
          {error ? <div style={{ color: '#ef4444' }}>{error}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </div>);
}
