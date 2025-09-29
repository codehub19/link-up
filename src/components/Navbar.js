"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Navbar;
var react_router_dom_1 = require("react-router-dom");
var AuthContext_1 = require("../state/AuthContext");
function Navbar() {
    var _a = (0, AuthContext_1.useAuth)(), user = _a.user, profile = _a.profile, logout = _a.logout, login = _a.login;
    var loc = (0, react_router_dom_1.useLocation)();
    return (<nav className="nav">
      <div className="nav-left">
        <react_router_dom_1.Link to="/" className="logo">LinkUp</react_router_dom_1.Link>
        <react_router_dom_1.Link to="/#how" className="nav-link">How it Works</react_router_dom_1.Link>
      </div>
      <div className="nav-right">
        {user && (profile === null || profile === void 0 ? void 0 : profile.isProfileComplete) ? (<>
            <react_router_dom_1.Link to="/dashboard" className="btn ghost">Dashboard</react_router_dom_1.Link>
            <button className="btn" onClick={logout}>Logout</button>
          </>) : user ? (<react_router_dom_1.Link to="/setup/gender" className="btn">Complete Profile</react_router_dom_1.Link>) : (<button className="btn" onClick={login}>Login with Google</button>)}
      </div>
    </nav>);
}
