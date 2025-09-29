"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileMiniCard;
var react_1 = require("react");
function ProfileMiniCard(_a) {
    var photoUrl = _a.photoUrl, name = _a.name, instagramId = _a.instagramId, bio = _a.bio, interests = _a.interests, footer = _a.footer;
    return (<div className="mini-card">
      <div className="mini-media">
        {photoUrl ? <img src={photoUrl} alt={name || 'profile'}/> : <div className="mini-placeholder"/>}
      </div>
      <div className="mini-body">
        <div className="mini-title">
          <strong className="ellipsis">{name !== null && name !== void 0 ? name : 'Student'}</strong>
          {instagramId ? <span className="muted">@{instagramId}</span> : null}
        </div>
        {bio ? <p className="mini-bio ellipsis-2">{bio}</p> : null}
        {(interests === null || interests === void 0 ? void 0 : interests.length) ? (<div className="mini-tags">
            {interests.slice(0, 3).map(function (t) { return (<span key={t} className="mini-tag">{t}</span>); })}
          </div>) : null}
      </div>
      {footer ? <div className="mini-footer">{footer}</div> : null}
    </div>);
}
