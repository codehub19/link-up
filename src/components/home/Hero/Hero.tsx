import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../state/AuthContext";
import "./Hero.styles.css";

export default function Hero() {
  const { user, login } = useAuth();

  return (
    <section className="hero-modern">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot"></span>
            <span>Now Live at Top Universities</span>
          </div>

          <h1 className="hero-title display-text">
            Dating for <br />
            <span className="text-gradient">Real Connections.</span>
          </h1>

          Skip the endless swiping. DateU connects you with verified students through curated rounds and safe, meaningful interactions.

          <div className="hero-actions">
            {!user ? (
              <button onClick={login} className="btn-modern btn-glow">
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