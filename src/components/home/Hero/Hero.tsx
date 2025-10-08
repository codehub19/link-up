import React from "react";
import { useAuth } from "../../../state/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import MatchPreview from "../MatchPreview/MatchPreview";
import "./Hero.styles.css";

const ROTATING_WORDS = ["Cool", "Real", "Safe", "Fun"];
function useRotatingWord(interval = 2200) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % ROTATING_WORDS.length), interval);
    return () => clearInterval(id);
  }, [interval]);
  return ROTATING_WORDS[i];
}

export default function Hero() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const rotating = useRotatingWord();
  const handlePrimary = () => {
    if (user) navigate("/dashboard");
    else login();
  };
  return (
    <section className="hero-wrapper">
      <div className="hero-back">
        <div className="hero-gradient-layer" />
        <div className="hero-noise-layer" />
        <div className="hero-orbs">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>
      </div>
      <div className="hero-inner container">
        <div className="hero-left">
          <h1 className="hero-title">
            Find <span className="rotating-word">{rotating}</span> Connections That Actually Matter
          </h1>
          <p className="hero-sub">
            DateU blends curated rounds, human matching signals, and a safety‑first core to help you build genuine relationships—not endless swipes.
          </p>
          <div className="hero-ctas">
            <button onClick={handlePrimary} className="btn btn-primary hero-btn-main">
              {user ? "Go to Dashboard" : "Get Started"}
            </button>
            <Link to="/how-it-works" className="btn hero-btn-secondary">
              How It Works
            </Link>
          </div>
          <div className="hero-mini-stats">
            <div>
              <strong>+92%</strong>
              <span>report deeper chats</span>
            </div>
            <div>
              <strong>Curated</strong>
              <span>limited round spots</span>
            </div>
            <div>
              <strong>Safety</strong>
              <span>verified & guided</span>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <MatchPreview />
          <div className="hero-callout">
            <span className="hc-dot" />
            Real profiles • No infinite feed • Transparent quotas
          </div>
        </div>
      </div>
    </section>
  );
}