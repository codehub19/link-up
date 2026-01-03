import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import InstallPWAButton from "./InstallPWAButton";
import MobileNavbar from "./MobileNavbar";
import "./Navbar.styles.css";

// --- Icons ---
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export default function Navbar() {
  const { user, profile, login } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll effect for glassmorphism intensity or transparency changes (optional hook)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Persistent Notification listener
  useEffect(() => {
    if (!user?.uid) {
      setHasUnread(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userUid", "==", user.uid),
      where("seen", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => {
      // For personal notifications, we don't need to filter by date.
      // If it exists in this query (uid match + seen false), it counts.
      setHasUnread(!snap.empty);
    });
    return () => unsub();
  }, [user?.uid]);

  // Clear notification badge
  const notificationsActive = loc.pathname === "/dashboard/notifications";
  useEffect(() => {
    if (notificationsActive) setHasUnread(false);
  }, [loc.pathname, notificationsActive]);

  const dashboardPath = "/dashboard";
  const isDashboardActive = loc.pathname.startsWith("/dashboard") && !notificationsActive;

  return (
    <>
      <header className={`navbar-modern ${scrolled ? "scrolled" : ""}`}>
        <div className="navbar-container">

          {/* Left: Brand */}
          <Link to="/" className="nav-brand-link">
            <h1 className="nav-brand text-gradient">DateU</h1>
          </Link>

          {/* Right: Actions */}
          <div className="nav-group">

            {user && profile?.isProfileComplete && (
              <>
                <Link
                  to={dashboardPath}
                  className={`nav-icon-btn ${isDashboardActive ? "active" : ""}`}
                  title="Dashboard"
                >
                  <GridIcon />
                </Link>

                <button
                  className={`nav-icon-btn ${notificationsActive ? "active" : ""}`}
                  title="Notifications"
                  onClick={() => {
                    setHasUnread(false);
                    navigate("/dashboard/notifications");
                  }}
                >
                  <BellIcon />
                  {hasUnread && !notificationsActive && <span className="badge-dot" />}
                </button>
              </>
            )}

            {/* Buttons: PWA + Login/Action */}
            <div className="nav-group gap-2"> {/* Tighter gap for buttons */}
              <div className="hide-mobile">
                <InstallPWAButton className="nav-btn nav-btn-ghost" label="Install App" />
              </div>

              {user && profile?.isProfileComplete ? (
                // If logged in & setup, maybe show nothing or settings icon? Keeping generic for now as requested.
                null
              ) : user ? (
                <Link to="/setup/profile" className="nav-btn nav-btn-primary">
                  Complete Setup
                </Link>
              ) : (
                <button
                  onClick={async () => {
                    const isNew = await login();
                    if (isNew) navigate("/setup/profile");
                    else navigate("/dashboard");
                  }}
                  className="nav-btn nav-btn-primary"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Global Mobile Navigation Dock */}
      <MobileNavbar />
    </>
  );
}