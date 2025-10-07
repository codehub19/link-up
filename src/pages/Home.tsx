import React, { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import MetricsBand from '../components/MetricsBand'
import './home.effects.css'


/* -----------------------------------------------------------------------------
 * Rotating Keyword
 * --------------------------------------------------------------------------- */
const ROTATING_WORDS = ['Meaningful', 'Real', 'Safe', 'Fun']
function useRotatingWord(interval = 2200) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % ROTATING_WORDS.length), interval)
    return () => clearInterval(id)
  }, [interval])
  return ROTATING_WORDS[i]
}

/* -----------------------------------------------------------------------------
 * Generic Tilt (for interactive cards)
 * --------------------------------------------------------------------------- */
function useTilt(max = 10) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      const rx = (py - 0.5) * -max
      const ry = (px - 0.5) * max
      el.style.setProperty('--tilt-rx', rx.toFixed(2) + 'deg')
      el.style.setProperty('--tilt-ry', ry.toFixed(2) + 'deg')
    }
    const leave = () => {
      el.style.setProperty('--tilt-rx', '0deg')
      el.style.setProperty('--tilt-ry', '0deg')
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [max])
  return ref
}

/* -----------------------------------------------------------------------------
 * Pulsing Score
 * --------------------------------------------------------------------------- */
function usePulseValue(start = 78, to = 92) {
  const [val, setVal] = useState(start)
  useEffect(() => {
    let dir = 1
    const id = setInterval(() => {
      setVal(v => {
        if (v >= to) dir = -1
        if (v <= start) dir = 1
        return Math.min(to, Math.max(start, v + dir * (Math.random() * 2 + 0.6)))
      })
    }, 420)
    return () => clearInterval(id)
  }, [start, to])
  return Math.round(val)
}

/* -----------------------------------------------------------------------------
 * Sample Profiles (Placeholder)
 * --------------------------------------------------------------------------- */
const sampleProfiles = [
  {
    name: 'Aarav',
    age: 23,
    tag: 'Growth Designer',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Aarav&scale=110',
    interests: ['Travel', 'Indie', 'Climb'],
  },
  {
    name: 'Ishita',
    age: 22,
    tag: 'AI Enthusiast',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Ishita&scale=110',
    interests: ['Poetry', 'Art', 'Matcha'],
  },
  {
    name: 'Rohan',
    age: 24,
    tag: 'Product Engineer',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Rohan&scale=110',
    interests: ['Running', 'Photos', 'Coffee'],
  },
]

/* -----------------------------------------------------------------------------
 * Match Preview Card
 * --------------------------------------------------------------------------- */
function MatchPreview() {
  const tiltRef = useTilt()
  const matchScore = usePulseValue()
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % sampleProfiles.length), 3600)
    return () => clearInterval(id)
  }, [])
  const p = sampleProfiles[index]
  return (
    <div ref={tiltRef} className="hero-match-card" aria-label="Live match preview demo">
      <div className="hm-card-bg" />
      <div className="hm-card-content">
        <div className="hm-avatar-wrap">
          <img src={p.avatar} alt={p.name} className="hm-avatar" loading="lazy" />
          <span className="hm-status-dot" aria-hidden="true" />
        </div>
        <div className="hm-main">
          <h4 className="hm-name">
            {p.name}, {p.age}
          </h4>
          <p className="hm-tag">{p.tag}</p>
          <ul className="hm-interests">
            {p.interests.map(it => <li key={it}>{it}</li>)}
          </ul>
        </div>
        <div className="hm-score">
          <span className="hm-score-value">{matchScore}%</span>
          <span className="hm-score-label">Match</span>
        </div>
      </div>
      <div className="hm-glow" />
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * HERO
 * --------------------------------------------------------------------------- */
function Hero() {
  const { user , login} = useAuth()
  const navigate = useNavigate()
  const rotating = useRotatingWord()
  const handlePrimary = () => {
    if (user) navigate('/dashboard')
    else login()
  }
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
              {user ? 'Go to Dashboard' : 'Get Started'}
            </button>
            <Link to="/how-it-works" className="btn hero-btn-secondary">How It Works</Link>
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
  )
}

/* -----------------------------------------------------------------------------
 * Feature Pillars
 * --------------------------------------------------------------------------- */
const FEATURES = [
  {
    icon: '⚡',
    title: 'Curated Rounds',
    text: 'No more endless swipes with our Curated Matching Rounds.',
  },
  {
    icon: '💬',
    title: 'Quality > Quantity',
    text: 'Fewer, higher‑signal introductions encourage real dialogue.',
  },
  {
    icon: '🛡️',
    title: 'Safety Layered In',
    text: 'Verification, reporting, and respectful design choices.',
  },
  {
    icon: '✨',
    title: 'Bot Deterrence',
    text: 'Product logic plus human review to discourage spam & bots.',
  },
]

function FeaturePillars() {
  return (
    <section className="section feature-pillars">
      <div className="container">
        <h2 className="section-title">Why Students Choose <span className="grad-accent">DateU</span></h2>
        <p className="section-sub">
          We removed the addictive noise loops and built around trust, pace, and authenticity.
        </p>
        <div className="pillars-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="pillar-card">
              <div className="pillar-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * Rounds Preview Carousel (Mock)
 * --------------------------------------------------------------------------- */
interface RoundPreview {
  id: string
  theme: string
  spots: number
  active?: boolean
  badge?: string
  color: string
  desc: string
}
const ROUND_MOCK: RoundPreview[] = [
  { id: 'art-vibes', theme: 'Art Vibes', spots: 40, active: true, badge: 'LIVE', color: '#ff5470', desc: 'Creative, design, visual energy' },
  { id: 'builders', theme: 'Builders & Hackers', spots: 28, color: '#7d45ff', desc: 'Makers, coders, product minds' },
  { id: 'travellers', theme: 'Travel Souls', spots: 32, color: '#ff8f3c', desc: 'Explorers, culture & wanderers' },
  { id: 'music-zone', theme: 'Indie Music', spots: 25, color: '#00c2b8', desc: 'Playlists, gigs & sonic taste' },
]

function useInterval(cb: () => void, delay: number | null) {
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(cb, delay)
    return () => clearInterval(id)
  }, [cb, delay])
}

function RoundsCarousel() {
  const [index, setIndex] = useState(0)
  const advance = useCallback(() => {
    setIndex(i => (i + 1) % ROUND_MOCK.length)
  }, [])
  useInterval(advance, 4000)

  return (
    <section className="section rounds-preview">
      <div className="container">
        <div className="rounds-head">
          <div>
            <h2>Curated Matching Rounds</h2>
            <p className="muted">Focus on one meaningful introduction at a time, inside intentionally limited themed groups.</p>
          </div>
          <Link to="/rounds" className="btn btn-primary btn-sm">View All Rounds</Link>
        </div>
        <div className="rounds-track">
          {ROUND_MOCK.map((r, i) => {
            const active = i === index
            return (
              <div
                key={r.id}
                className={`round-card ${active ? 'active' : ''}`}
                style={{ '--accent-clr': r.color } as any}
              >
                {r.badge && <span className="round-badge">{r.badge}</span>}
                <h3>{r.theme}</h3>
                <p>{r.desc}</p>
                <div className="round-meta">
                  <span>{r.spots} spots</span>
                  {r.active && <span className="live-dot">• enrolling now</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="dots">
          {ROUND_MOCK.map((_, i) => (
            <button
              key={i}
              aria-label={`Show round ${i + 1}`}
              className={i === index ? 'on' : ''}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * Why It Works Timeline
 * --------------------------------------------------------------------------- */
const TIMELINE = [
  {
    title: "Intent Onboarding",
    text: "Short profile + interests surfaces what actually matters.",
  },
  {
    title: "Focused Rounds",
    text: "You’re not competing with endless scroll—just a small curated batch.",
  },
  {
    title: "Mutual Reveal",
    text: "Only mutual interest unlocks names / socials to cut noise & spam.",
  },
  {
    title: "Paced Discovery",
    text: "Limited simultaneous matches = deeper conversations, less burnout.",
  },
];

function WhyItWorks() {
  return (
    <section className="section why-works-minimal">
      <div className="container">
        <h2 className="why-works-title">Engineered For Intent</h2>
        <p className="why-works-sub">
          Every layer encourages authenticity, safety and better social outcomes.
        </p>
        <div className="why-works-timeline">
          <div className="why-works-flowline" aria-hidden="true"></div>
          {TIMELINE.map((t, i) => (
            <div className="why-works-step" key={t.title} style={{ animationDelay: `${i * 120}ms` }}>
              <div className="why-works-dot">
                <span className="why-works-dot-inner">{i + 1}</span>
              </div>
              <div className="why-works-card">
                <div className="why-works-step-title">{t.title}</div>
                <div className="why-works-step-text">{t.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
/* -----------------------------------------------------------------------------
 * Animated Counters
 * --------------------------------------------------------------------------- */
function useCount(to: number, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let frame: number
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setVal(Math.floor(p * to))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [to, duration])
  return val
}
// import React from 'react'

/**
 * Assumes you already have a hook like:
 * function useCount(to: number, duration = 1400) { ... }
 * If not, a fallback inline implementation is provided (uncomment below).
 */

// Fallback (uncomment if you don't already have one):
// function useCount(to: number, duration = 1400) {
//   const [v, setV] = React.useState(0)
//   React.useEffect(() => {
//     let raf: number
//     const start = performance.now()
//     const tick = (t: number) => {
//       const p = Math.min(1, (t - start) / duration)
//       setV(p * to)
//       if (p < 1) raf = requestAnimationFrame(tick)
//     }
//     raf = requestAnimationFrame(tick)
//     return () => cancelAnimationFrame(raf)
//   }, [to, duration])
//   return v
// }

type CounterSpec = { label: string; value: number; suffix?: string; icon?: string }

const COUNTERS: CounterSpec[] = [
  { label: 'Meaningful Intros', value: 3200, icon: 'heart' },
  { label: 'Rounds Curated', value: 57, icon: 'layers' },
  { label: 'Reported Spam', value: 0, suffix: '%', icon: 'shield' },
  { label: 'Campus Communities', value: 18, icon: 'campus' },
]

/* Small icon library (inline SVG) to keep network clean */
function Icon({ id }: { id?: string }) {
  switch (id) {
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 21s-1.9-1.55-4.2-3.56C4.2 15 2 12.9 2 9.9 2 7 4.1 5 6.7 5c1.6 0 3.1.9 4 2.3C11.6 5.9 13.1 5 14.7 5 17.3 5 19.5 7 19.5 9.9c0 3-2.2 5.1-5.8 7.54C13.9 19.45 12 21 12 21z"
            stroke="url(#grad-heart)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="rgba(255,65,108,0.12)"
          />
          <defs>
            <linearGradient id="grad-heart" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'layers':
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 3l9 5-9 5-9-5 9-5z"
            stroke="url(#grad-layers)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="rgba(255,75,43,0.1)"
          />
          <path
            d="M5 12l7 4 7-4M5 16.5l7 4 7-4"
            stroke="url(#grad-layers)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-layers" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff8f48" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M12 3l7 3v6c0 4.4-2.9 8.4-7 9-4.1-.6-7-4.6-7-9V6l7-3z"
            stroke="url(#grad-shield)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="rgba(255,65,108,0.08)"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="url(#grad-shield)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-shield" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'campus':
    default:
      return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <path
            d="M4 19h16M4 11l8-6 8 6-8 5-8-5zM8 14v5M16 14v5"
            stroke="url(#grad-campus)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="grad-campus" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#ff416c" />
              <stop offset="1" stopColor="#ff4b2b" />
            </linearGradient>
          </defs>
        </svg>
      )
  }
}

export function Counters() {
  return (
    <section className="section counters-modern" aria-labelledby="stats-heading">
      <div className="container">
        <h2 className="visually-hidden" id="stats-heading">
          Platform Stats
        </h2>
        <div className="counters-shell">
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} spec={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CounterCard({ spec, index }: { spec: CounterSpec; index: number }) {
  const v = useCount(spec.value)
  const display =
    spec.value % 1 === 0
      ? Math.round(v).toLocaleString()
      : v.toFixed(1)

  return (
    <article
      className="counterx"
      style={{ animationDelay: `${index * 90}ms` }}
      aria-label={`${spec.label}: ${spec.value}${spec.suffix || ''}`}
    >
      <div className="counterx-border" aria-hidden="true" />
      <div className="counterx-inner">
        <div className="counterx-icon">
          <Icon id={spec.icon} />
        </div>
        <div className="counterx-value">
          {display}
          {spec.suffix || ''}
        </div>
        <div className="counterx-label">{spec.label}</div>
      </div>
    </article>
  )
}

/* -----------------------------------------------------------------------------
 * Safety (refined)
 * --------------------------------------------------------------------------- */
// import React from "react";

function Safety() {
  const items = [
    {
      icon: "🪪",
      title: "Identity Signals",
      text: "Institution context & manual checks reduce catfishing risk.",
    },
    {
      icon: "🧊",
      title: "Pace & Presence",
      text: "Interaction patterns discourage blast DMs—depth > noise.",
    },
    {
      icon: "🛟",
      title: "Report & Escalate",
      text: "Fast in‑flow reporting & escalation if something feels off.",
    },
    {
      icon: "🔐",
      title: "Privacy Guardrails",
      text: "Selective reveal of handles & personal info until mutual trust.",
    },
  ];

  return (
    <section className="safety-modern" aria-labelledby="safety-heading">
      <div className="safety-shell container">
        <header className="safety-header">
          <h2 id="safety-heading">
            Safety <span className="grad-accent">Baked In</span>
          </h2>
          <p className="safety-sub">
            Layered trust signals, controlled revelation, and fast mitigation so you
            can explore connections comfortably.
          </p>
        </header>
        <ul className="safety-grid" role="list">
          {items.map((i) => (
            <li key={i.title} className="safety-card" tabIndex={0} aria-label={`${i.title}: ${i.text}`}>
              <div className="card-icon">{i.icon}</div>
              <div className="card-title">{i.title}</div>
              <div className="card-text">{i.text}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Testimonials
 * --------------------------------------------------------------------------- */
// import React, { useRef, useEffect } from "react";

interface Testimonial {
  rating: number;
  text: string;
  author: string;
  role: string;
  avatar: string;
}

// Add more testimonials for a smoother scroll
const TESTIMONIALS: Testimonial[] = [
  {
    rating: 5,
    text: "Fewer profiles meant I actually read them. Quality uplift is real.",
    author: "Simran",
    role: "DTU",
    avatar: "/assets/av1.jpg",
  },
  {
    rating: 4,
    text: "It feels intentional. I don’t doom scroll and burn out.",
    author: "Arjun",
    role: "IIT Delhi",
    avatar: "/assets/av2.jpg",
  },
  {
    rating: 5,
    text: "Felt safe & respected, plus the UI is clean.",
    author: "Karan",
    role: "NSUT",
    avatar: "/assets/av3.jpg",
  },
  {
    rating: 5,
    text: "Met people I now collaborate with. Not just matches—actual network.",
    author: "Nisha",
    role: "DU North",
    avatar: "/assets/av4.jpg",
  },
  {
    rating: 5,
    text: "The round cadence keeps me engaged without overwhelm.",
    author: "Manya",
    role: "IIIT Delhi",
    avatar: "/assets/av5.jpg",
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="testi-card">
      <span className="testi-quote">“</span>
      <blockquote>{t.text}</blockquote>
      <div className="testi-author">
        <img src={t.avatar} alt={t.author} className="testi-avatar" />
        <div>
          <div className="testi-name">{t.author}</div>
          <div className="testi-role">{t.role}</div>
          <div className="testi-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < t.rating ? "star on" : "star"}>★</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Duplicate testimonials for seamless loop (3x is safe!)
function getInfiniteRow(testimonials: Testimonial[], repeat = 3, reverse = false) {
  let arr: Testimonial[] = [];
  for (let i = 0; i < repeat; i++) arr = arr.concat(testimonials);
  return reverse ? [...arr].reverse() : arr;
}

function Testimonials() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pause animation on hover (accessibility)
    const rows = [row1Ref.current, row2Ref.current];
    rows.forEach(row => {
      if (!row) return;
      row.addEventListener("mouseenter", () => row.style.animationPlayState = "paused");
      row.addEventListener("mouseleave", () => row.style.animationPlayState = "running");
    });
    return () => {
      rows.forEach(row => {
        if (!row) return;
        row.removeEventListener("mouseenter", () => row.style.animationPlayState = "paused");
        row.removeEventListener("mouseleave", () => row.style.animationPlayState = "running");
      });
    };
  }, []);

  // Adjust repeat (number of times the array is duplicated) for longer rows if needed
  return (
    <section className="section testimonials-auto">
      <div className="container">
        <h2 className="testi-title">What Students Say</h2>
        <div className="testi-rows">
          <div className="testi-row" ref={row1Ref}>
            {getInfiniteRow(TESTIMONIALS, 3, false).map((t, i) => (
              <TestimonialCard t={t} key={`row1-${i}-${t.author}-${i}`} />
            ))}
          </div>
          {/* <div className="testi-row reverse" ref={row2Ref}>
            {getInfiniteRow(TESTIMONIALS, 3, true).map((t, i) => (
              <TestimonialCard t={t} key={`row2-${i}-${t.author}-${i}`} />
            ))}
          </div> */}
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * FAQ
 * --------------------------------------------------------------------------- */
// import React from "react";

const FAQS = [
  {
    q: "How are rounds curated?",
    a: "We theme and cap them. Limited supply nudges thoughtfulness and reduces message spam.",
  },
  {
    q: "Is my social handle public?",
    a: "No—mutual interest first. This protects your privacy and lowers cold spam.",
  },
  {
    q: "Do I have to be a student?",
    a: "Yes right now. Academic affiliation adds a baseline trust layer for everyone.",
  },
  {
    q: "Why not infinite swipes?",
    a: "Because behavioral drain & novelty chasing reduce actual connection quality.",
  },
];

function FAQ() {
  return (
    <section className="section faq-modern">
      <div className="container">
        <h2>FAQ</h2>
        <div className="faq-items">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div className="faq-answer">
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Final CTA
 * --------------------------------------------------------------------------- */
function FinalCTA() {
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
          <p>
            Join the next curated round—intentional discovery without the noise.
          </p>
          <div className="heart-burst-wrap">
            <button className="btn btn-primary btn-lg heart-burst-btn" onClick={go}>
              <span className="heart-burst-emoji">💖</span>
              {user ? "Enter Dashboard" : "Join Now"}
            </button>
            <div className="heart-burst">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`heart-burst-heart heart-burst-heart${i+1}`}>💖</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Page Assembly
 * --------------------------------------------------------------------------- */
export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <FeaturePillars />
      {/* <RoundsCarousel /> */}
      <WhyItWorks />
      <Counters />
      {/* <MetricsBand /> */}
      <Safety />
      <Testimonials />
      <FAQ />
      <FinalCTA />
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
                <li><Link to="/blog">Blog</Link></li>
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
    </>
  )
}