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
exports.default = MaleEditProfile;
var Navbar_1 = require("../../../components/Navbar");
var AuthContext_1 = require("../../../state/AuthContext");
var react_1 = require("react");
var FileUpload_1 = require("../../../components/FileUpload");
var InterestsSelect_1 = require("../../../components/InterestsSelect");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../../firebase");
var sonner_1 = require("sonner");
var MaleTabs_1 = require("../../../components/MaleTabs");
function MaleEditProfile() {
    var _this = this;
    var _a, _b, _c, _d;
    var _e = (0, AuthContext_1.useAuth)(), user = _e.user, profile = _e.profile, refreshProfile = _e.refreshProfile;
    var _f = (0, react_1.useState)((_a = profile === null || profile === void 0 ? void 0 : profile.name) !== null && _a !== void 0 ? _a : ''), name = _f[0], setName = _f[1];
    var _g = (0, react_1.useState)((_b = profile === null || profile === void 0 ? void 0 : profile.instagramId) !== null && _b !== void 0 ? _b : ''), insta = _g[0], setInsta = _g[1];
    var _h = (0, react_1.useState)((_c = profile === null || profile === void 0 ? void 0 : profile.bio) !== null && _c !== void 0 ? _c : ''), bio = _h[0], setBio = _h[1];
    var _j = (0, react_1.useState)((_d = profile === null || profile === void 0 ? void 0 : profile.interests) !== null && _d !== void 0 ? _d : []), interests = _j[0], setInterests = _j[1];
    var _k = (0, react_1.useState)(null), file = _k[0], setFile = _k[1];
    var _l = (0, react_1.useState)(false), saving = _l[0], setSaving = _l[1];
    (0, react_1.useEffect)(function () {
        var _a, _b, _c, _d;
        if (profile) {
            setName((_a = profile.name) !== null && _a !== void 0 ? _a : '');
            setInsta((_b = profile.instagramId) !== null && _b !== void 0 ? _b : '');
            setBio((_c = profile.bio) !== null && _c !== void 0 ? _c : '');
            setInterests((_d = profile.interests) !== null && _d !== void 0 ? _d : []);
        }
    }, [profile]);
    var save = function () { return __awaiter(_this, void 0, void 0, function () {
        var photoUrl, e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    setSaving(true);
                    photoUrl = profile === null || profile === void 0 ? void 0 : profile.photoUrl;
                    if (!file) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, firebase_1.uploadProfilePhoto)(user.uid, file)];
                case 2:
                    photoUrl = _b.sent();
                    _b.label = 3;
                case 3: return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'users', user.uid), {
                        name: name,
                        instagramId: insta.replace(/^@/, ''),
                        bio: bio,
                        interests: interests,
                        photoUrl: photoUrl,
                    })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, refreshProfile()];
                case 5:
                    _b.sent();
                    sonner_1.toast.success('Profile updated');
                    return [3 /*break*/, 8];
                case 6:
                    e_1 = _b.sent();
                    sonner_1.toast.error((_a = e_1.message) !== null && _a !== void 0 ? _a : 'Failed to update');
                    return [3 /*break*/, 8];
                case 7:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    return (<>
      <Navbar_1.default />
      <div className="container">
        <MaleTabs_1.default />
        <h2>Edit Profile</h2>
        <div className="form">
          <label>Name</label>
          <input value={name} onChange={function (e) { return setName(e.target.value); }}/>
          <label>Instagram</label>
          <div className="ig">
            <span>@</span>
            <input value={insta.replace(/^@/, '')} onChange={function (e) { return setInsta(e.target.value); }}/>
          </div>
          <label>Photo</label>
          <FileUpload_1.default onFile={setFile} previewUrl={profile === null || profile === void 0 ? void 0 : profile.photoUrl}/>
          <label>Bio</label>
          <textarea value={bio} onChange={function (e) { return setBio(e.target.value); }}/>
          <label>Interests</label>
          <InterestsSelect_1.default value={interests} onChange={setInterests}/>
          <div className="actions">
            <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </>);
}
