"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_router_dom_1 = require("react-router-dom");
var Home_1 = require("./pages/Home");
var Gender_1 = require("./pages/setup/Gender");
var Profile_1 = require("./pages/setup/Profile");
var Plans_1 = require("./pages/dashboard/male/Plans");
var MaleMatches_1 = require("./pages/dashboard/male/MaleMatches");
var EditProfile_1 = require("./pages/dashboard/male/EditProfile");
var MatchingRound_1 = require("./pages/dashboard/female/MatchingRound");
var Connections_1 = require("./pages/dashboard/female/Connections");
var EditProfile_2 = require("./pages/dashboard/female/EditProfile");
var AuthContext_1 = require("./state/AuthContext");
var Protected_1 = require("./components/Protected");
var DashboardChooser_1 = require("./pages/dashboard/DashboardChooser");
var PaymentPage_1 = require("./pages/PaymentPage");
var RoundsAdmin_1 = require("./pages/admin/RoundsAdmin");
var PaymentsAdmin_1 = require("./pages/admin/PaymentsAdmin");
var CurationAdmin_1 = require("./pages/admin/CurationAdmin");
var AdminLogin_1 = require("./pages/admin/AdminLogin");
var PlansAdmin_1 = require("./pages/admin/PlansAdmin");
var AdminHome_1 = require("./pages/admin/AdminHome");
function App() {
    var _a = (0, AuthContext_1.useAuth)(), user = _a.user, profile = _a.profile;
    return (<react_router_dom_1.Routes>
      <react_router_dom_1.Route path="/" element={<Home_1.default />}/>

      {/* Onboarding */}
      <react_router_dom_1.Route path="/setup/gender" element={<Protected_1.default requireProfile={false}>
            <Gender_1.default />
          </Protected_1.default>}/>
      <react_router_dom_1.Route path="/setup/profile" element={<Protected_1.default requireProfile={false}>
            {!(profile === null || profile === void 0 ? void 0 : profile.gender) ? <react_router_dom_1.Navigate to="/setup/gender" replace/> : <Profile_1.default />}
          </Protected_1.default>}/>

      {/* Dashboard entry decides male/female */}
      <react_router_dom_1.Route path="/dashboard" element={<Protected_1.default>
            <DashboardChooser_1.default />
          </Protected_1.default>}/>

      {/* Male */}
      <react_router_dom_1.Route path="/dashboard/plans" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'male' ? <Plans_1.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>
      <react_router_dom_1.Route path="/dashboard/matches" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'male' ? <MaleMatches_1.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>
      <react_router_dom_1.Route path="/dashboard/edit-profile" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'male' ? <EditProfile_1.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>

      {/* Female */}
      <react_router_dom_1.Route path="/dashboard/round" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'female' ? <MatchingRound_1.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>
      <react_router_dom_1.Route path="/dashboard/connections" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'female' ? <Connections_1.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>
      <react_router_dom_1.Route path="/dashboard/female/edit-profile" element={<Protected_1.default>
            {(profile === null || profile === void 0 ? void 0 : profile.gender) === 'female' ? <EditProfile_2.default /> : <react_router_dom_1.Navigate to="/dashboard" replace/>}
          </Protected_1.default>}/>

      {/* Payments */}
      <react_router_dom_1.Route path="/pay" element={<PaymentPage_1.default />}/>
      <react_router_dom_1.Route path="/pay/:planId" element={<PaymentPage_1.default />}/>

      {/* Admin entry: single home for all controls */}
      <react_router_dom_1.Route path="/admin" element={<AdminHome_1.default />}/>
      <react_router_dom_1.Route path="/admin/rounds" element={<RoundsAdmin_1.default />}/>
      <react_router_dom_1.Route path="/admin/payments" element={<PaymentsAdmin_1.default />}/>
      <react_router_dom_1.Route path="/admin/login" element={<AdminLogin_1.default />}/>
      <react_router_dom_1.Route path="/admin/curation" element={<CurationAdmin_1.default />}/>
      <react_router_dom_1.Route path="/admin/plans" element={<PlansAdmin_1.default />}/>

      <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/" replace/>}/>
    </react_router_dom_1.Routes>);
}
