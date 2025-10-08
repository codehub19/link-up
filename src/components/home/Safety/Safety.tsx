import React from "react";
import "./Safety.styles.css";

const items = [
  {
    icon: "🪪",
    title: "Identity Signals",
    text: "Institution context & manual checks reduce catfishing risk.",
  },
  {
    icon: "🧊",
    title: "Pace & Presence",
    text: "Interaction patterns discourage blast DMs—depth > noise.",
  },
  {
    icon: "🛟",
    title: "Report & Escalate",
    text: "Fast in‑flow reporting & escalation if something feels off.",
  },
  {
    icon: "🔐",
    title: "Privacy Guardrails",
    text: "Selective reveal of handles & personal info until mutual trust.",
  },
];

export default function Safety() {
  return (
    <section className="safety-modern" aria-labelledby="safety-heading">
      <div className="safety-shell container">
        <header className="safety-header">
          <h2 id="safety-heading">
            Safety <span className="grad-accent">Baked In</span>
          </h2>
          <p className="safety-sub">
            Layered trust signals, controlled revelation, and fast mitigation so you can explore connections comfortably.
          </p>
        </header>
        <ul className="safety-grid" role="list">
          {items.map((i) => (
            <li key={i.title} className="safety-card" tabIndex={0} aria-label={`${i.title}: ${i.text}`}>
              <div className="card-icon">{i.icon}</div>
              <div className="card-title">{i.title}</div>
              <div className="card-text">{i.text}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}