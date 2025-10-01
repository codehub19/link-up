import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import React, { useEffect, useRef } from 'react'
import './home.effects.css'

/** Subtle layered background: gradient mesh + tiny floating hearts */
function HomeBackground() {
  // No DOM work here; just decorative layers via CSS
  return (
    <div className="home-bg" aria-hidden="true">
      <div className="mesh mesh-1" />
      <div className="mesh mesh-2" />
      <div className="mesh mesh-3" />
      <div className="hearts-layer">
        {Array.from({ length: 14 }).map((_, i) => (
          <svg
            key={i}
            className={`h-heart h-heart-${i}`}
            width="20"
            height="20"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M16 29s-13-8.35-13-17A7 7 0 0 1 16 7a7 7 0 0 1 13 5c0 8.65-13 17-13 17z"
              fill="url(#hgrad)"
            />
            <defs>
              <linearGradient id="hgrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff416c" />
                <stop offset="1" stopColor="#ff4b2b" />
              </linearGradient>
            </defs>
          </svg>
        ))}
      </div>
    </div>
  )
}

/** Tiny heart burst on CTA click */
function useHeartBurst() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const handler = (e: MouseEvent) => {
      const el = document.createElement('div')
      el.className = 'heart-burst'
      el.style.left = `${e.clientX}px`
      el.style.top = `${e.clientY}px`
      el.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
          <path d="M16 29s-13-8.35-13-17A7 7 0 0 1 16 7a7 7 0 0 1 13 5c0 8.65-13 17-13 17z" fill="url(#g)"/>
          <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#ff416c"/><stop offset="1" stop-color="#ff4b2b"/></linearGradient></defs>
        </svg>`
      c.appendChild(el)
      setTimeout(() => el.remove(), 900)
    }
    c.addEventListener('click', handler)
    return () => c.removeEventListener('click', handler)
  }, [])

  return containerRef
}

/** Horizontal marquee chips (swap with logos later) */
function CollegesMarquee() {
  const chips = ['IIT Delhi', 'DTU', 'IIIT Delhi', 'NSUT', 'DU North', 'DU South', 'JMI', 'IITM']
  return (
    <div className="marquee-wrap" aria-label="Participating colleges">
      <div className="marquee-track">
        {[...chips, ...chips].map((c, i) => (
          <span key={i} className="chip">{c}</span>
        ))}
      </div>
    </div>
  )
}

/** Swipe preview phone mock */
function SwipePreview() {
  const cards = [
    { name: 'Aisha, 20', bio: 'Design • Coffee • Indie', img: '/assets/demo1.jpg' },
    { name: 'Rohan, 21', bio: 'MMA • Startups • Rap', img: '/assets/demo2.jpg' },
    { name: 'Simran, 19', bio: 'Photography • Dance • Foodie', img: '/assets/demo3.jpg' },
  ]
  return (
    <div className="phone-demo">
      <div className="notch" />
      <div className="screen">
        {cards.map((c, i) => (
          <div className={`card-demo cd-${i}`} key={i} style={{ backgroundImage: `url(${c.img})` }}>
            <div className="cd-overlay">
              <div className="cd-name">{c.name}</div>
              <div className="cd-bio">{c.bio}</div>
            </div>
            <div className="cd-actions">
              <button className="cd-btn nope" aria-label="Nope">✕</button>
              <button className="cd-btn like" aria-label="Like">❤</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()
  const burstLayerRef = useHeartBurst()

  const cta = async () => {
    if (user) {
      if (profile?.isProfileComplete) nav('/dashboard')
      else nav('/setup/gender')
      return
    }
    const isNew = await login()
    if (isNew) nav('/setup/gender')
    else nav('/dashboard')
  }

  return (
    <>
      <Navbar />
      <HomeBackground />
      <div className="home-burst-layer" ref={burstLayerRef} aria-hidden="true" />
      <header className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>Meaningful Connections, Made in College.</h1>
            <p className="sub">Curated rounds. No endless swiping. Safer, smarter, and just your vibe.</p>
            <div className="cta">
              <button className="btn primary" onClick={cta}>
                {user ? 'Go to Dashboard' : 'Join Now'}
              </button>
              <a className="btn ghost" href="#how">How it Works</a>
            </div>
            <div className="trust-row">
              <span className="trust-dot" /> Loved by students across Delhi NCR
            </div>
          </div>
          <div className="hero-visual">
            <SwipePreview />
          </div>
        </div>
        <CollegesMarquee />
      </header>

      <section id="how" className="section">
        <div className="container">
          <h2>How it works</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">1</div>
              <h3>Create Your Profile</h3>
              <p>Onboard with Google. Add your photo, bio, and interests.</p>
            </div>
            <div className="how-card">
              <div className="how-num">2</div>
              <h3>Boys Join a Round</h3>
              <p>Enter curated rounds to be discovered by girls.</p>
            </div>
            <div className="how-card">
              <div className="how-num">3</div>
              <h3>Girls Choose</h3>
              <p>View a handful of profiles. Tap who you vibe with.</p>
            </div>
            <div className="how-card">
              <div className="how-num">4</div>
              <h3>Connect on Insta</h3>
              <p>Mutual likes reveal names and Insta IDs to both.</p>
            </div>
            <div className="how-connector" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="section safety-section">
        <div className="container">
          <div className="safety-card">
            <div className="safety-icon">
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="27" fill="url(#safetyGrad)" />
                <path d="M27 44c-12-9-19-15-19-23A9 9 0 0 1 27 12a9 9 0 0 1 19 7c0 8-7 14-19 23z" fill="#fff"/>
                <defs>
                  <linearGradient id="safetyGrad" x1="0" y1="0" x2="54" y2="54">
                    <stop stopColor="#ff416c" />
                    <stop offset="1" stopColor="#ff4b2b" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h2 className="safety-title">Safety First for Girls</h2>
              <ul className="safety-list">
                <li>Girls curate rounds—no random DMs ever.</li>
                <li>Info reveals only on mutual match.</li>
                <li>College verification for every user.</li>
                <li>Report and block in a single tap.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="container">
          <h2>What Students Say</h2>
          <div className="reviews-grid">
            {[
              { name: 'Aisha', college: 'IIIT Delhi', text: 'Felt safe and respected. Found some wonderful friends!' },
              { name: 'Rohan', college: 'IIT Delhi', text: 'Curated rounds > endless swiping. Love it.' },
              { name: 'Simran', college: 'DTU', text: 'Finally an app that actually cares about girls’ safety.' },
            ].map((r, idx) => (
              <div className="review-card" key={idx}>
                <div className="review-avatar">{r.name[0]}</div>
                <div>
                  <div className="review-name">
                    {r.name} <span className="review-college">{r.college}</span>
                  </div>
                  <div className="review-text">{r.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="container">
          <h2>FAQ</h2>
          <div className="faq-list">
            <details>
              <summary>How are rounds curated?</summary>
              <p>We run short, themed rounds. Profiles are reviewed to keep quality high and spam low.</p>
            </details>
            <details>
              <summary>Is my Insta revealed to everyone?</summary>
              <p>No. Your Instagram is visible only on mutual matches.</p>
            </details>
            <details>
              <summary>Do I need to be in college?</summary>
              <p>Yes. We verify you with your institution details to keep LinkUp college‑exclusive.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="container">
          <div className="cta-card">
            <div>
              <h3>Ready to vibe with someone real?</h3>
              <p>Join the next round and let the magic happen.</p>
            </div>
            <button className="btn primary" onClick={cta}>
              {user ? 'Go to Dashboard' : 'Join Now'}
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-links">
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Contact</Link>
          </div>
          <div className="copy">© {new Date().getFullYear()} LinkUp</div>
        </div>
      </footer>
    </>
  )
}