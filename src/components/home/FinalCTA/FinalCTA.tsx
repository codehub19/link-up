import React from "react";
import { useAuth } from "../../../state/AuthContext";
import { useNavigate } from "react-router-dom";
import "./FinalCTA.styles.css";

export default function FinalCTA() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const go = () => {
    if (user) navigate("/dashboard");
    else login();
  };

  return (
    <section className="section final-cta-modern">
      <div className="container final-cta-box">
        <div className="final-cta-text">
          <h2>Ready to meet someone authentic?</h2>
          <p>Join the next curated round—intentional discovery without the noise.</p>
          <div className="heart-burst-wrap">
            <button className="btn btn-primary btn-lg heart-burst-btn" onClick={go}>
              <span className="heart-burst-emoji">💖</span>
              {user ? "Enter Dashboard" : "Join Now"}
            </button>
            <div className="heart-burst">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`heart-burst-heart heart-burst-heart${i + 1}`}>
                  💖
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}