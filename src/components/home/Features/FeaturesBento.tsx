import React from "react";
import "./FeaturesBento.styles.css";

export default function FeaturesBento() {
    return (
        <section className="section bento-section">
            <div className="container">
                <div className="section-header margin-bottom">
                    <h2 className="section-title text-gradient">Everything you need.</h2>
                    <p className="lead-text">
                        One app to meet new people, make plans and stay in touch.
                    </p>
                </div>

                <div className="bento-grid">
                    {/* Card 1: Curated Rounds (Large, Featured) */}
                    <div className="bento-card span-8 span-md-12 feature-glow">
                        <div className="bento-content">
                            <div className="bento-icon">👋</div>
                            <h3>Friends on your campus</h3>
                            <p>
                                Discover students from your college and nearby campuses, see what you have in common, and send a friend request with a quick hello. Study buddies, gym partners, people to explore the city with.
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
                                Students verify their college ID and get a badge, so you know who you're talking to.
                            </p>
                            <div className="bento-visual visual-shield">
                                <div className="shield-icon">✓</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Quality (Medium) */}
                    <div className="bento-card span-4 span-md-6">
                        <div className="bento-content">
                            <div className="bento-icon">🎪</div>
                            <h3>Events &amp; fests</h3>
                            <p>Find your garba partner, fest crew or trek buddy.</p>
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
                            <div className="bento-icon">📞</div>
                            <h3>Voice calls &amp; chat</h3>
                            <p>Quick random calls to meet someone new, then chat. Dating rounds are optional.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
