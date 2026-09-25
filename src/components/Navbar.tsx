import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import InstallPWAButton from "./InstallPWAButton";
import { subscribeUnread } from "../services/notifications";
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

function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8l4 4 6-7 6 7 4-4-2 11H4z" />
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

  // Bell dot: only while something is actually unread
  useEffect(() => {
    if (!user?.uid) {
      setHasUnread(false);
      return;
    }
    const joinedAtMs = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
    return subscribeUnread(user.uid, { joinedAtMs, profileSeenAt: profile?.notificationsSeenAt }, setHasUnread);
  }, [user?.uid, profile?.notificationsSeenAt]);

  // Clear notification badge
  const notificationsActive = loc.pathname === "/dashboard/notifications";
  useEffect(() => {
    if (notificationsActive) setHasUnread(false);
  }, [loc.pathname, notificationsActive]);

  // Screens opened from a tab get a native back button + title in the top bar
  const profileTab = profile?.gender === "male" ? "/dashboard/male/profile" : "/dashboard/female/profile";
  const PUSHED: Record<string, [string, string]> = {
    "/dashboard/notifications": ["Notifications", "/dashboard"],
    "/dashboard/edit-profile": ["Edit Profile", profileTab],
    "/dashboard/settings": ["Settings", profileTab],
    "/dashboard/support-history": ["Support", profileTab],
    "/dashboard/plans": ["Premium", profileTab],
    "/dashboard/premium": ["Premium", profileTab],
    "/pay": ["Payment", profileTab],
  };
  const pushed = PUSHED[loc.pathname] || (loc.pathname.startsWith("/profile/") ? ["Profile", "/dashboard/matches"] as [string, string] : null);
  const pushedTitle = pushed?.[0];
  const pushedParent = pushed?.[1] || "/dashboard";

  const dashboardPath = "/dashboard";
  const isDashboardActive = loc.pathname.startsWith("/dashboard") && !notificationsActive;

  return (
    <>
      <header className={`navbar-modern ${scrolled ? "scrolled" : ""}`}>
        <div className="navbar-container">

          {/* Left: back + title on pushed app screens, otherwise the brand */}
          {pushedTitle ? (
            <div className="nav-pushed">
              <button
                className="nav-back-btn"
                aria-label="Back"
                onClick={() => {
                  // Go back within the app if we came from it, otherwise to the parent tab
                  if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
                  else navigate(pushedParent, { replace: true })
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="nav-pushed-title">{pushedTitle}</span>
            </div>
          ) : (
            <Link to={user && profile?.isProfileComplete ? "/dashboard" : "/"} className="nav-brand-link">
              <h1 className="nav-brand text-gradient">DateU</h1>
            </Link>
          )}

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

                <Link
                  to={profile?.gender === "male" ? "/dashboard/plans" : "/dashboard/premium"}
                  className={`nav-icon-btn ${loc.pathname === "/dashboard/plans" || loc.pathname === "/dashboard/premium" ? "active" : ""}`}
                  title="Premium"
                  aria-label="Premium"
                >
                  <CrownIcon />
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
    </>
  );
}