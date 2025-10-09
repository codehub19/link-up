import React from "react";
import "./FeaturePillars.styles.css";

const FEATURES = [
  {
    icon: "⚡",
    title: "Curated Rounds",
    text: "No more endless swipes with our Curated Matching Rounds.",
  },
  {
    icon: "💬",
    title: "Quality > Quantity",
    text: "Fewer, higher‑signal introductions encourage real dialogue.",
  },
  {
    icon: "🛡️",
    title: "Safety Layered In",
    text: "Verification, reporting, and respectful design choices.",
  },
  {
    icon: "✨",
    title: "Bot Deterrence",
    text: "Product logic plus human review to discourage spam & bots.",
  },
];

export default function FeaturePillars() {
  return (
    <section className="section feature-pillars">
      <div className="hero-back">
        <div className="hero-gradient-layer" />
        <div className="hero-noise-layer" />
        <div className="hero-orbs">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>
      </div>
      <div className="container">
        <h2 className="section-title">
          Why Students Choose <span className="grad-accent">DateU</span>
        </h2>
        <p className="section-sub">
          We removed the addictive noise loops and built around trust, pace, and authenticity.
        </p>
        <div className="pillars-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="pillar-card">
              <div className="pillar-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}