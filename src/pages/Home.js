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
exports.default = Home;
var Navbar_1 = require("../components/Navbar");
var AuthContext_1 = require("../state/AuthContext");
var react_router_dom_1 = require("react-router-dom");
function Home() {
    var _this = this;
    var _a = (0, AuthContext_1.useAuth)(), user = _a.user, profile = _a.profile, login = _a.login;
    var nav = (0, react_router_dom_1.useNavigate)();
    var cta = function () { return __awaiter(_this, void 0, void 0, function () {
        var isNew;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // If already logged in, route by profile completeness
                    if (user) {
                        if (profile === null || profile === void 0 ? void 0 : profile.isProfileComplete)
                            nav('/dashboard');
                        else
                            nav('/setup/gender');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, login()];
                case 1:
                    isNew = _a.sent();
                    if (isNew)
                        nav('/setup/gender');
                    else
                        nav('/dashboard');
                    return [2 /*return*/];
            }
        });
    }); };
    return (<>
      <Navbar_1.default />
      <header className="hero">
        <div className="hero-inner">
          <h1>Meaningful Connections, Made in College.</h1>
          <p className="sub">A curated, college-exclusive matchmaking experience for Delhi NCR.</p>
          <div className="cta">
            <button className="btn primary" onClick={cta}>
              {user ? 'Go to Dashboard' : 'Login with Google'}
            </button>
            <a className="btn ghost" href="#how">How it Works</a>
          </div>
        </div>
      </header>

      <section id="how" className="section">
        <h2>How it works</h2>
        <div className="grid cols-4">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Create Your Profile</h3>
            <p>Quick onboarding with Google, your photo, bio, and interests.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Boys Join a Round</h3>
            <p>Paid entry for a curated round to be seen by girls.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Girls Choose</h3>
            <p>View 5 profiles, like who you vibe with.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3>Connect on Insta</h3>
            <p>Mutual likes reveal names and Insta IDs to both.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Why LinkUp?</h2>
        <div className="grid cols-3">
          <div className="feature">
            <h3>College-Exclusive</h3>
            <p>Only verified students from Delhi NCR colleges.</p>
          </div>
          <div className="feature">
            <h3>Curated, Not Endless</h3>
            <p>Rounds replace swiping. Quality over quantity.</p>
          </div>
          <div className="feature">
            <h3>Safe and Respectful</h3>
            <p>Girls curate, mutual reveal only on confirmed matches.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-links">
          <react_router_dom_1.Link to="/">Privacy Policy</react_router_dom_1.Link>
          <react_router_dom_1.Link to="/">Terms of Service</react_router_dom_1.Link>
          <react_router_dom_1.Link to="/">Contact</react_router_dom_1.Link>
        </div>
        <div className="copy">© {new Date().getFullYear()} LinkUp</div>
      </footer>
    </>);
}
