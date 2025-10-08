import React from "react";
import "./FAQ.styles.css";

const FAQS = [
  {
    q: "How are rounds curated?",
    a: "We theme and cap them. Limited supply nudges thoughtfulness and reduces message spam.",
  },
  {
    q: "Is my social handle public?",
    a: "No—mutual interest first. This protects your privacy and lowers cold spam.",
  },
  {
    q: "Do I have to be a student?",
    a: "Yes right now. Academic affiliation adds a baseline trust layer for everyone.",
  },
  {
    q: "Why not infinite swipes?",
    a: "Because behavioral drain & novelty chasing reduce actual connection quality.",
  },
];

export default function FAQ() {
  return (
    <section className="section faq-modern">
      <div className="container">
        <h2>FAQ</h2>
        <div className="faq-items">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div className="faq-answer">
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}