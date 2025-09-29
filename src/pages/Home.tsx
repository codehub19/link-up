import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Home() {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()

  const cta = async () => {
    if (!user) await login()
    if (user && profile?.isProfileComplete) nav('/dashboard')
    else nav('/setup/gender')
  }

  return (
    <>
      <Navbar />
      <header className="hero">
        <div className="hero-inner">
          <h1>Meaningful Connections, Made in College.</h1>
          <p className="sub">A curated, college-exclusive matchmaking experience for Delhi NCR.</p>
          <div className="cta">
            <button className="btn primary" onClick={cta}>
              {user ? 'Go to Dashboard' : 'Login with Google'}
            </button>
            <a className="btn ghost" href="#how">How it Works</a>
          </div>
        </div>
      </header>

      <section id="how" className="section">
        <h2>How it works</h2>
        <div className="grid cols-4">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Create Your Profile</h3>
            <p>Quick onboarding with Google, your photo, bio, and interests.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Boys Join a Round</h3>
            <p>Paid entry for a curated round to be seen by girls.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Girls Choose</h3>
            <p>View 5 profiles, like who you vibe with.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3>Connect on Insta</h3>
            <p>Mutual likes reveal names and Insta IDs to both.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Why LinkUp?</h2>
        <div className="grid cols-3">
          <div className="feature">
            <h3>College-Exclusive</h3>
            <p>Only verified students from Delhi NCR colleges.</p>
          </div>
          <div className="feature">
            <h3>Curated, Not Endless</h3>
            <p>Rounds replace swiping. Quality over quantity.</p>
          </div>
          <div className="feature">
            <h3>Safe and Respectful</h3>
            <p>Girls curate, mutual reveal only on confirmed matches.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-links">
          <Link to="/">Privacy Policy</Link>
          <Link to="/">Terms of Service</Link>
          <Link to="/">Contact</Link>
        </div>
        <div className="copy">© {new Date().getFullYear()} LinkUp</div>
      </footer>
    </>
  )
}