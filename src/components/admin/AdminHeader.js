"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminHeader;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var payments_1 = require("../../services/payments");
function AdminHeader(_a) {
    var current = _a.current;
    var loc = (0, react_router_dom_1.useLocation)();
    var _b = (0, react_1.useState)(0), pendingCount = _b[0], setPendingCount = _b[1];
    (0, react_1.useEffect)(function () {
        // lightweight count for badge
        (0, payments_1.listPendingPayments)().then(function (rows) { return setPendingCount(rows.length); }).catch(function () { return setPendingCount(0); });
    }, [loc.pathname]);
    var Item = function (p) { return (<react_router_dom_1.Link className={"btn ".concat(current === p.id ? 'btn-primary' : 'btn-ghost')} to={p.to} style={{ position: 'relative' }}>
      {p.label}
      {p.id === 'payments' && pendingCount > 0 ? (<span className="tag" style={{ position: 'absolute', top: -10, right: -10 }}>{pendingCount}</span>) : null}
    </react_router_dom_1.Link>); };
    return (<div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <Item to="/admin" label="Home" id="home"/>
      <Item to="/admin/rounds" label="Rounds" id="rounds"/>
      <Item to="/admin/payments" label="Payments" id="payments"/>
      <Item to="/admin/curation" label="Curation" id="curation"/>
      <Item to="/admin/plans" label="Plans" id="plans"/>
    </div>);
}
