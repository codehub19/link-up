"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileCard;
var react_1 = require("react");
function ProfileCard(_a) {
    var _b;
    var data = _a.data, footer = _a.footer;
    return (<div className="card">
      <div className="card-media">
        {data.photoUrl ? <img src={data.photoUrl} alt="profile"/> : <div className="media-placeholder"/>}
      </div>
      <div className="card-body">
        <p className="bio">{data.bio}</p>
        <div className="tags">
          {((_b = data.interests) !== null && _b !== void 0 ? _b : []).map(function (i) { return (<span key={i} className="tag">{i}</span>); })}
        </div>
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>);
}
