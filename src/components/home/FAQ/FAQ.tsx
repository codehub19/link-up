import React from "react";
import "./FAQ.styles.css";

const FAQS = [
  {
    q: "Is DateU a dating app?",
    a: "DateU is for making new friends and connections on campus. Friends, events, chat and voice calls are the heart of it. Dating is an optional extra you can turn on in the Dating tab — or ignore completely.",
  },
  {
    q: "How do I make friends on DateU?",
    a: "Open Friends, browse students from your college or nearby campuses, and send a friend request with a short hello. Once they accept, you can chat and call.",
  },
  {
    q: "What are events?",
    a: "Fests, garba nights, treks, study groups and meetups. Tap “I’m going”, see who else is going, and find a partner or group to go with.",
  },
  {
    q: "Is it free?",
    a: "Yes. Friends, events, chat, calls and dating rounds are free. Premium is optional and just puts you first.",
  },
  {
    q: "Is my Instagram or phone number shown?",
    a: "No. Your profile shows your first name, photos, college and interests — never your phone number, email or social handles.",
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