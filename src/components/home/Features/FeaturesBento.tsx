import React from "react";
import "./FeaturesBento.styles.css";

export default function FeaturesBento() {
    return (
        <section className="section bento-section">
            <div className="container">
                <div className="section-header margin-bottom">
                    <h2 className="section-title text-gradient">Everything you need.</h2>
                    <p className="lead-text">
                        Designed for safety, quality, and real connections.
                    </p>
                </div>

                <div className="bento-grid">
                    {/* Card 1: Curated Rounds (Large, Featured) */}
                    <div className="bento-card span-8 span-md-12 feature-glow">
                        <div className="bento-content">
                            <div className="bento-icon">⚡</div>
                            <h3>Curated Matching Rounds</h3>
                            <p>
                                No more endless swiping. Get a limited selection of high-quality matches released in "Rounds". This creates urgency and focus, leading to 92% deeper conversations.
                            </p>
                            <div className="bento-visual visual-rounds">
                                {/* CSS-only mini rep of a round card */}
                                <div className="mini-card c1"></div>
                                <div className="mini-card c2"></div>
                                <div className="mini-card c3"></div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Verified (Tall) */}
                    <div className="bento-card span-4 span-md-12">
                        <div className="bento-content">
                            <div className="bento-icon">🛡️</div>
                            <h3>Verified Badges</h3>
                            <p>
                                Students get a "Verified Student" badge. General users are ID-checked. Know exactly who you're talking to.
                            </p>
                            <div className="bento-visual visual-shield">
                                <div className="shield-icon">✓</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Quality (Medium) */}
                    <div className="bento-card span-4 span-md-6">
                        <div className="bento-content">
                            <div className="bento-icon">💬</div>
                            <h3>Quality &gt; Quantity</h3>
                            <p>Focus on people, not profiles.</p>
                        </div>
                    </div>

                    {/* Card 4: Safety (Medium) */}
                    <div className="bento-card span-4 span-md-6">
                        <div className="bento-content">
                            <div className="bento-icon">🔒</div>
                            <h3>Safety First</h3>
                            <p>Built-in reporting and easy blocking.</p>
                        </div>
                    </div>

                    {/* Card 5: Bot Deterrence (Medium) */}
                    <div className="bento-card span-4 span-md-12">
                        <div className="bento-content">
                            <div className="bento-icon">🤖</div>
                            <h3>No Bots Allowed</h3>
                            <p>Advanced detection systems.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
