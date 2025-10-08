import react from 'react';
import './Footer.styles.css';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-modern">
        <div className="container footer-inner">
          <div className="footer-cols">
            <div>
              <h4>DateU</h4>
              <p className="muted small">Built for campus connections.</p>
            </div>
            <div>
              <h5>Product</h5>
              <ul>
                <li><Link to="/rounds">Rounds</Link></li>
                <li><Link to="/how-it-works">How It Works</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/support">Support</Link></li>
                <li><Link to="/community-guidelines">Community Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h5>Legal</h5>
              <ul>
                <li><Link to="/legal/privacy">Privacy</Link></li>
                <li><Link to="/legal/terms">Terms</Link></li>
                <li><Link to="/legal/cookies">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="copy small">
            © {new Date().getFullYear()} DateU • Crafted for better digital social pacing.
          </div>
        </div>
      </footer>
  )}
  