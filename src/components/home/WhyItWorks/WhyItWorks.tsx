import React from "react";
import "./WhyItWorks.styles.css";

const TIMELINE = [
  {
    title: "Intent Onboarding",
    text: "Short profile + interests surfaces what actually matters.",
  },
  {
    title: "Focused Rounds",
    text: "You’re not competing with endless scroll—just a small curated batch.",
  },
  {
    title: "Mutual Reveal",
    text: "Only mutual interest unlocks names / socials to cut noise & spam.",
  },
  {
    title: "Paced Discovery",
    text: "Limited simultaneous matches = deeper conversations, less burnout.",
  },
];

export default function WhyItWorks() {
  return (
    <section className="section why-works-minimal">
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
        <h2 className="why-works-title">Why <span className="grad-accent">DateU</span> Works</h2>
        <p className="why-works-sub">
          Every layer encourages authenticity, safety and better social outcomes.
        </p>
        <div className="why-works-timeline">
          <div className="why-works-flowline" aria-hidden="true"></div>
          {TIMELINE.map((t, i) => (
            <div className="why-works-step" key={t.title} style={{ animationDelay: `${i * 120}ms` }}>
              <div className="why-works-dot">
                <span className="why-works-dot-inner">{i + 1}</span>
              </div>
              <div className="why-works-card">
                <div className="why-works-step-title">{t.title}</div>
                <div className="why-works-step-text">{t.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}