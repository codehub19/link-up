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
            <span>Made for college students</span>
          </div>

          <h1 className="hero-title display-text">
            Make new friends, <br />
            <span className="text-gradient">on campus.</span>
          </h1>

          DateU is where students meet new people — find friends on your campus, join events and fest meetups, and talk on quick voice calls. Dating is there too, if you want it.

          <div className="hero-actions">
            {!user ? (
              <button
                onClick={async () => {
                  const isNew = await login();
                  if (typeof isNew === 'boolean') {
                    if (isNew) navigate("/setup/profile", { replace: true });
                    else navigate("/dashboard", { replace: true });
                  }
                }}
                className="btn-modern btn-glow"
              >
                Start making friends
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
              <strong>👋</strong>
              <span>Friends</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-item">
              <strong>🎪</strong>
              <span>Events</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-item">
              <strong>📞</strong>
              <span>Voice calls</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}