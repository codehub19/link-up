import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../state/AuthContext";
import "./Hero.styles.css";

export default function Hero() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="hero-modern">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot"></span>
            <span>Now Live at Top Universities</span>
          </div>

          <h1 className="hero-title display-text">
            Real connections, <br />
            <span className="text-gradient">on campus.</span>
          </h1>

          Date, make friends, or just talk. DateU connects verified college students through curated dating rounds, 5-minute voice calls and a students-only Friends space.

          <div className="hero-actions">
            {!user ? (
              <button
                onClick={async () => {
                  const isNew = await login();
                  if (typeof isNew === 'boolean') {
                    if (isNew) navigate("/setup/profile");
                    else navigate("/dashboard");
                  }
                }}
                className="btn-modern btn-glow"
              >
                Start Matching
              </button>
            ) : (
              <Link to="/dashboard" className="btn-modern btn-glow">
                Go to Dashboard
              </Link>
            )}
            <a href="#how-it-works" className="btn-modern btn-glass">
              How it works
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <strong>10k+</strong>
              <span>Students</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-item">
              <strong>92%</strong>
              <span>Verified</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-item">
              <strong>4.9</strong>
              <span>Rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}