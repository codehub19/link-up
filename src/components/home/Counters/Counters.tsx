import React from "react";
import "./Counters.styles.css";

type CounterSpec = { label: string; value: number; suffix?: string; icon?: string };

const COUNTERS: CounterSpec[] = [
  { label: "Meaningful Intros", value: 3200, icon: "heart" },
  { label: "Rounds Curated", value: 57, icon: "layers" },
  { label: "Reported Spam", value: 0, suffix: "%", icon: "shield" },
  { label: "Campus Communities", value: 18, icon: "campus" },
];

function useCount(to: number, duration = 1400) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    let frame: number;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.floor(p * to));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);
  return val;
}

function Icon({ id }: { id?: string }) {
  switch (id) {
    case "heart":
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 21s-1.9-1.55-4.2-3.56C4.2 15 2 12.9 2 9.9 2 7 4.1 5 6.7 5c1.6 0 3.1.9 4 2.3C11.6 5.9 13.1 5 14.7 5 17.3 5 19.5 7 19.5 9.9c0 3-2.2 5.1-5.8 7.54C13.9 19.45 12 21 12 21z"
            stroke="url(#grad-heart)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="rgba(255,65,108,0.12)"
          />
          <defs>
            <linearGradient id="grad-heart" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 3l9 5-9 5-9-5 9-5z"
            stroke="url(#grad-layers)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="rgba(255,75,43,0.1)"
          />
          <path
            d="M5 12l7 4 7-4M5 16.5l7 4 7-4"
            stroke="url(#grad-layers)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-layers" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff8f48" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 3l7 3v6c0 4.4-2.9 8.4-7 9-4.1-.6-7-4.6-7-9V6l7-3z"
            stroke="url(#grad-shield)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="rgba(255,65,108,0.08)"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="url(#grad-shield)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-shield" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "campus":
    default:
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M4 19h16M4 11l8-6 8 6-8 5-8-5zM8 14v5M16 14v5"
            stroke="url(#grad-campus)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-campus" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      );
  }
}

function CounterCard({ spec, index }: { spec: CounterSpec; index: number }) {
  const v = useCount(spec.value);
  const display = spec.value % 1 === 0 ? Math.round(v).toLocaleString() : v.toFixed(1);
  return (
    <article className="counterx" style={{ animationDelay: `${index * 90}ms` }} aria-label={`${spec.label}: ${spec.value}${spec.suffix || ""}`}>
      <div className="counterx-border" aria-hidden="true" />
      <div className="counterx-inner">
        <div className="counterx-icon">
          <Icon id={spec.icon} />
        </div>
        <div className="counterx-value">
          {display}
          {spec.suffix || ""}
        </div>
        <div className="counterx-label">{spec.label}</div>
      </div>
    </article>
  );
}

export default function Counters() {
  return (
    <section className="section counters-modern" aria-labelledby="stats-heading">
      <div className="container">
        <h2 className="visually-hidden" id="stats-heading">
          Platform Stats
        </h2>
        <div className="counters-shell">
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} spec={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}