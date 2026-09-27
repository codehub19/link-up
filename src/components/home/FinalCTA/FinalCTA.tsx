import React from "react";
import { useAuth } from "../../../state/AuthContext";
import { useNavigate } from "react-router-dom";
import "./FinalCTA.styles.css";

export default function FinalCTA() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const go = async () => {
    if (user) {
      navigate("/dashboard");
    } else {
      const isNew = await login();
      if (typeof isNew === 'boolean') {
        if (isNew) navigate("/setup/profile", { replace: true });
        else navigate("/dashboard", { replace: true });
      }
    }
  };

  return (
    <section className="section final-cta-modern">

      <div className="container final-cta-box">
        <div className="final-cta-text">
          <h2>Your next friend is on campus.</h2>
          <p>Join DateU, say hi to new people and never go to a fest alone again.</p>
          <div className="heart-burst-wrap">
            <button className="btn btn-primary btn-lg heart-burst-btn" onClick={go}>
              <span className="heart-burst-emoji">👋</span>
              {user ? "Enter Dashboard" : "Join Now"}
            </button>
            <div className="heart-burst">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`heart-burst-heart heart-burst-heart${i + 1}`}>
                  ✨
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}