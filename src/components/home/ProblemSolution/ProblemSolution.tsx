import React from "react";
import "./ProblemSolution.styles.css";

export default function ProblemSolution() {
    return (
        <section className="section problem-section">
            <div className="container">
                <div className="section-header">
                    <span className="badge-pill">Why DateU</span>
                    <h2 className="section-title">Making friends shouldn’t be this hard.</h2>
                    <p className="lead-text">
                        New city, new college, same few people. We built DateU so meeting new people on campus is easy.
                    </p>
                </div>

                <div className="comparison-grid">
                    {/* OLD WAY */}
                    <div className="comp-card old-way">
                        <div className="comp-header">
                            <h3>The usual way</h3>
                            <span className="icon-x">✕</span>
                        </div>
                        <ul className="comp-list">
                            <li>
                                <span className="li-icon">👻</span>
                                <div>
                                    <strong>Same circle</strong>
                                    <p>You only meet people from your class or hostel.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">🤖</span>
                                <div>
                                    <strong>Awkward to start</strong>
                                    <p>No easy way to say hi to someone new.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">♾️</span>
                                <div>
                                    <strong>Going alone</strong>
                                    <p>Fests and events are less fun without people to go with.</p>
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
                                <span className="li-icon">👋</span>
                                <div>
                                    <strong>Friends on campus</strong>
                                    <p>Find students who share your interests and say hi.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">🛡️</span>
                                <div>
                                    <strong>Students only</strong>
                                    <p>Real, verified college students.</p>
                                </div>
                            </li>
                            <li>
                                <span className="li-icon">⚡</span>
                                <div>
                                    <strong>Go together</strong>
                                    <p>Find a partner or group for fests, garba nights and treks.</p>
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
