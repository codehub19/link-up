"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminGuard;
var react_1 = require("react");
var AuthContext_1 = require("../../state/AuthContext");
function AdminGuard(_a) {
    var children = _a.children;
    var _b = (0, AuthContext_1.useAuth)(), user = _b.user, profile = _b.profile, loading = _b.loading;
    if (loading)
        return null;
    // treat isAdmin as unknown schema, fallback to false if missing
    var isAdmin = Boolean(profile === null || profile === void 0 ? void 0 : profile.isAdmin);
    if (!user) {
        return (<div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 800 }}>
          Please sign in to access the admin area.
        </div>
      </div>);
    }
    if (!isAdmin) {
        return (<div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 800 }}>
          You are not authorized to view this page.
        </div>
      </div>);
    }
    return <>{children}</>;
}
