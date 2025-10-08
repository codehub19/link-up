import React from "react";
import "./MatchPreview.styles.css";

const sampleProfiles = [
  {
    name: "Aarav",
    age: 23,
    tag: "Growth Designer",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=Aarav&scale=110",
    interests: ["Travel", "Indie", "Climb"],
  },
  {
    name: "Ishita",
    age: 22,
    tag: "AI Enthusiast",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=Ishita&scale=110",
    interests: ["Poetry", "Art", "Matcha"],
  },
  {
    name: "Rohan",
    age: 24,
    tag: "Product Engineer",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=Rohan&scale=110",
    interests: ["Running", "Photos", "Coffee"],
  },
];

function useTilt(max = 10) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * -max;
      const ry = (px - 0.5) * max;
      el.style.setProperty("--tilt-rx", rx.toFixed(2) + "deg");
      el.style.setProperty("--tilt-ry", ry.toFixed(2) + "deg");
    };
    const leave = () => {
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [max]);
  return ref;
}

function usePulseValue(start = 78, to = 92) {
  const [val, setVal] = React.useState(start);
  React.useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setVal((v) => {
        if (v >= to) dir = -1;
        if (v <= start) dir = 1;
        return Math.min(to, Math.max(start, v + dir * (Math.random() * 2 + 0.6)));
      });
    }, 420);
    return () => clearInterval(id);
  }, [start, to]);
  return Math.round(val);
}

export default function MatchPreview() {
  const tiltRef = useTilt();
  const matchScore = usePulseValue();
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % sampleProfiles.length), 3600);
    return () => clearInterval(id);
  }, []);
  const p = sampleProfiles[index];
  return (
    <div ref={tiltRef} className="hero-match-card" aria-label="Live match preview demo">
      <div className="hm-card-bg" />
      <div className="hm-card-content">
        <div className="hm-avatar-wrap">
          <img src={p.avatar} alt={p.name} className="hm-avatar" loading="lazy" />
          <span className="hm-status-dot" aria-hidden="true" />
        </div>
        <div className="hm-main">
          <h4 className="hm-name">
            {p.name}, {p.age}
          </h4>
          <p className="hm-tag">{p.tag}</p>
          <ul className="hm-interests">
            {p.interests.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
        <div className="hm-score">
          <span className="hm-score-value">{matchScore}%</span>
          <span className="hm-score-label">Match</span>
        </div>
      </div>
      <div className="hm-glow" />
    </div>
  );
}