import React from "react";
import "./Footer.styles.css";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-modern">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <h2 className="footer-logo text-gradient">DateU</h2>
            <p className="footer-desc">
              Dating for the modern campus.
              <br />
              REAL connections, verified students.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-link" target="_blank" rel="noopener noreferrer">𝕏</a>
              <a href="https://www.instagram.com/dateu_official_/" className="social-link" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/company/dateu/" className="social-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link to="/rounds">How it Works</Link></li>
              <li><Link to="/success-stories">Stories</Link></li>
              <li><Link to="/pricing">Premium</Link></li>
              <li><Link to="/download">Download App</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/terms">Terms of Service</Link></li>
              <li><Link to="/legal/guidelines">Guidelines</Link></li>
              <li><Link to="/legal/security">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">
            © {currentYear} DateU Inc. All rights reserved.
          </p>
          <div className="bottom-links">
            <span className="status-dot"></span>
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}