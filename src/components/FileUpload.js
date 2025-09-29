"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FileUpload;
var react_1 = require("react");
function FileUpload(_a) {
    var onFile = _a.onFile, _b = _a.accept, accept = _b === void 0 ? 'image/*' : _b, previewUrl = _a.previewUrl;
    var _c = (0, react_1.useState)(previewUrl), local = _c[0], setLocal = _c[1];
    var handle = function (e) {
        var _a;
        var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (f) {
            setLocal(URL.createObjectURL(f));
            onFile(f);
        }
    };
    return (<div className="upload">
      <div className="upload-box">
        {local ? <img src={local} alt="preview" className="preview"/> : <div className="upload-placeholder">Upload a photo</div>}
      </div>
      <input type="file" accept={accept} onChange={handle}/>
    </div>);
}
