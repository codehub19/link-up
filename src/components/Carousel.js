"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Carousel;
var react_1 = require("react");
function Carousel(_a) {
    var children = _a.children, _b = _a.itemWidth, itemWidth = _b === void 0 ? 220 : _b, _c = _a.gap, gap = _c === void 0 ? 12 : _c;
    var ref = (0, react_1.useRef)(null);
    var scrollBy = function (dir) {
        if (!ref.current)
            return;
        ref.current.scrollBy({ left: dir * (itemWidth + gap) * 2, behavior: 'smooth' });
    };
    return (<div className="carousel-wrap">
      <button className="carousel-btn left" onClick={function () { return scrollBy(-1); }} aria-label="Previous">‹</button>
      <div className="carousel" ref={ref} style={{ gap: gap }}>
        {children}
      </div>
      <button className="carousel-btn right" onClick={function () { return scrollBy(1); }} aria-label="Next">›</button>
    </div>);
}
