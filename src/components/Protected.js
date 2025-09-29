"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Protected;
var react_router_dom_1 = require("react-router-dom");
var AuthContext_1 = require("../state/AuthContext");
function Protected(_a) {
    var children = _a.children, _b = _a.requireProfile, requireProfile = _b === void 0 ? true : _b;
    var _c = (0, AuthContext_1.useAuth)(), user = _c.user, profile = _c.profile, loading = _c.loading;
    var loc = (0, react_router_dom_1.useLocation)();
    if (loading)
        return null;
    if (!user) {
        return <react_router_dom_1.Navigate to="/" state={{ from: loc }} replace/>;
    }
    if (requireProfile && !(profile === null || profile === void 0 ? void 0 : profile.isProfileComplete)) {
        // Redirect to onboarding
        if (!(profile === null || profile === void 0 ? void 0 : profile.gender))
            return <react_router_dom_1.Navigate to="/setup/gender" replace/>;
        return <react_router_dom_1.Navigate to="/setup/profile" replace/>;
    }
    return <>{children}</>;
}
