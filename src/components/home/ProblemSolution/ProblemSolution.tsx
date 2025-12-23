import React from "react";
import "./ProblemSolution.styles.css";

export default function ProblemSolution() {
    return (
        <section className="section problem-section">
            <div className="container">
                <div className="section-header">
                    <span className="badge-pill">The Reality Check</span>
                    <h2 className="section-title">Why the old apps failed you.</h2>
                    <p className="lead-text">
                        We built DateU because we were tired of the same endless cycle.
                    </p>
                </div>

                <div className="comparison-grid">
                    {/* OLD WAY */}
                    <div className="comp-card old-way">
                        <div className="comp-header">
                            <h3>The Swipe Apps</h3>
                            <span className="icon-x">✕</span>
                        </div>
                        <ul className="comp-list">
                            <li>
                                <span className="li-icon">👻</span>
                                <div>
                                    <strong>Ghost Town</strong>
                                    <p>Matches that never talk.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">🤖</span>
                                <div>
                                    <strong>Bot Infested</strong>
                                    <p>Fake profiles everywhere.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">♾️</span>
                                <div>
                                    <strong>Endless Loop</strong>
                                    <p>Designed to keep you swiping.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* NEW WAY */}
                    <div className="comp-card new-way">
                        <div className="comp-header">
                            <h3>The DateU Way</h3>
                            <span className="icon-check">✓</span>
                        </div>
                        <ul className="comp-list">
                            <li>
                                <span className="li-icon">❤️</span>
                                <div>
                                    <strong>Real Rounds</strong>
                                    <p>Limited batches, high intent.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">🛡️</span>
                                <div>
                                    <strong>Verified Community</strong>
                                    <p>Real profiles, ID checked.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">⚡</span>
                                <div>
                                    <strong>Meaningful</strong>
                                    <p>Designed to get you offline.</p>
                                </div>
                            </li>
                        </ul>
                        <div className="glow-effect"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
