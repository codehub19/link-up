import React from "react";
import "./HowItWorksSteps.styles.css";

const STEPS = [
    {
        num: "01",
        title: "Get Verified",
        desc: "Upload your College ID. Our AI + Human review ensures only real students get in.",
        icon: "🆔"
    },
    {
        num: "02",
        title: "Join a Round",
        desc: "Matches drop in limited 'Rounds'. Everyone is active at the same time.",
        icon: "🔥"
    },
    {
        num: "03",
        title: "Real Dates",
        desc: "Move from chat to campus meetups. We encourage getting offline.",
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
