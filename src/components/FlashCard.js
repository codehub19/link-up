"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlashCard;
var react_1 = require("react");
function FlashCard(_a) {
    var title = _a.title, subtitle = _a.subtitle, children = _a.children, onNext = _a.onNext, onBack = _a.onBack, _b = _a.nextLabel, nextLabel = _b === void 0 ? 'Next' : _b, _c = _a.backLabel, backLabel = _c === void 0 ? 'Back' : _c, nextDisabled = _a.nextDisabled, footer = _a.footer;
    var ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var el = ref.current;
        if (!el)
            return;
        el.classList.add('fade-enter');
        requestAnimationFrame(function () {
            el.classList.add('fade-enter-active');
            el.classList.remove('fade-enter');
        });
        return function () {
            el.classList.add('fade-exit');
            requestAnimationFrame(function () {
                el === null || el === void 0 ? void 0 : el.classList.add('fade-exit-active');
            });
        };
    }, []);
    return (<div ref={ref} className="flash-card card">
      <div className="stack" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 26 }}>{title}</h2>
        {subtitle ? <p style={{ margin: 0, color: 'var(--muted)' }}>{subtitle}</p> : null}
      </div>

      <div className="stack" style={{ flex: 1 }}>
        {children}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <div>
          {onBack ? <button className="btn btn-ghost" onClick={onBack}>{backLabel}</button> : <span />}
        </div>
        <div className="row" style={{ gap: 10 }}>
          {footer}
          {onNext ? <button className="btn btn-primary" disabled={nextDisabled} onClick={onNext}>{nextLabel}</button> : null}
        </div>
      </div>
    </div>);
}
