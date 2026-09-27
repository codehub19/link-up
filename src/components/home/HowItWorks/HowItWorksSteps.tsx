import React from "react";
import "./HowItWorksSteps.styles.css";

const STEPS = [
    {
        num: "01",
        title: "Create your profile",
        desc: "Sign in with Google, add a photo, your college and what you’re into. Takes a minute.",
        icon: "🆔"
    },
    {
        num: "02",
        title: "Meet people",
        desc: "Say hi to students in Friends, join an event, or hop on a quick voice call.",
        icon: "👋"
    },
    {
        num: "03",
        title: "Hang out",
        desc: "Chat, make plans and meet up on campus. Try dating too, whenever you like.",
        icon: "☕"
    }
];

export default function HowItWorksSteps() {
    return (
        <section id="how-it-works" className="section steps-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title text-gradient">Simple. Safe. Social.</h2>
                </div>

                <div className="steps-container">
                    {/* Connecting Line (Desktop) */}
                    <div className="steps-line"></div>

                    <div className="steps-grid">
                        {STEPS.map((step, idx) => (
                            <div key={idx} className="step-card">
                                <div className="step-number">{step.num}</div>
                                <div className="step-icon-box">{step.icon}</div>
                                <div className="step-content">
                                    <h3>{step.title}</h3>
                                    <p>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
