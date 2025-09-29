"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MaleTabs;
var react_router_dom_1 = require("react-router-dom");
function MaleTabs() {
    var loc = (0, react_router_dom_1.useLocation)();
    var is = function (p) { return loc.pathname.startsWith(p); };
    return (<div className="row" style={{ gap: 8, marginBottom: 16 }}>
      <react_router_dom_1.Link className={"btn ".concat(is('/dashboard/plans') ? 'primary' : 'ghost')} to="/dashboard/plans">Purchase</react_router_dom_1.Link>
      <react_router_dom_1.Link className={"btn ".concat(is('/dashboard/matches') ? 'primary' : 'ghost')} to="/dashboard/matches">Matches</react_router_dom_1.Link>
      <react_router_dom_1.Link className={"btn ".concat(is('/dashboard/edit-profile') ? 'primary' : 'ghost')} to="/dashboard/edit-profile">Edit Profile</react_router_dom_1.Link>
    </div>);
}
