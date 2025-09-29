"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InterestsSelect;
var react_1 = require("react");
var ALL_INTERESTS = [
    'Music', 'Gaming', 'Books', 'Travel', 'Startups', 'Fitness', 'Movies', 'Tech', 'Art', 'Dance', 'Food', 'Photography',
];
function InterestsSelect(_a) {
    var value = _a.value, onChange = _a.onChange, _b = _a.max, max = _b === void 0 ? 5 : _b;
    var selected = new Set(value);
    var options = (0, react_1.useMemo)(function () { return ALL_INTERESTS.map(function (i) { return ({ label: i, value: i }); }); }, []);
    var toggle = function (v) {
        var next = new Set(selected);
        if (selected.has(v))
            next.delete(v);
        else {
            if (selected.size >= max)
                return;
            next.add(v);
        }
        onChange(Array.from(next));
    };
    return (<div className="chip-grid">
      {options.map(function (opt) { return (<button type="button" key={opt.value} className={"chip ".concat(selected.has(opt.value) ? 'chip-selected' : '')} onClick={function () { return toggle(opt.value); }}>
          {opt.label}
        </button>); })}
      <div className="muted">Select up to {max}</div>
    </div>);
}
