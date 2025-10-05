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
  const { user } = useAuth()
  const navigate = useNavigate()
  const rotating = useRotatingWord()
  const handlePrimary = () => {
    if (user) navigate('/dashboard')
    else navigate('/auth/signup')
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
            LinkUp blends curated rounds, human matching signals, and a safety‑first core to help you build genuine relationships—not endless swipes.
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
    text: 'Short themed batches increase intent and reduce noise.',
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
    title: 'Human + Product Blend',
    text: 'Product logic plus human review to discourage spam & bots.',
  },
]

function FeaturePillars() {
  return (
    <section className="section feature-pillars">
      <div className="container">
        <h2 className="section-title">Why Students Choose LinkUp</h2>
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
    title: 'Intent Onboarding',
    text: 'Short profile + interests surfaces what actually matters.',
  },
  {
    title: 'Focused Rounds',
    text: 'You’re not competing with endless scroll—just a small curated batch.',
  },
  {
    title: 'Mutual Reveal',
    text: 'Only mutual interest unlocks names / socials to cut noise & spam.',
  },
  {
    title: 'Paced Discovery',
    text: 'Limited simultaneous matches = deeper conversations, less burnout.',
  },
]

function WhyItWorks() {
  return (
    <section className="section why-works">
      <div className="container">
        <h2>Engineered For Intent</h2>
        <p className="section-sub">Every layer encourages authenticity, safety and better social outcomes.</p>
        <div className="timeline">
          {TIMELINE.map((t, i) => (
            <div key={t.title} className="timeline-item">
              <div className="tl-index">{i + 1}</div>
              <div className="tl-body">
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            </div>
          ))}
          <div className="timeline-line" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
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
function Counters() {
  const counters = [
    { label: 'Meaningful Intros', value: 3200 },
    { label: 'Rounds Curated', value: 57 },
    { label: 'Reported Spam', value: 0, suffix: '%' },
    { label: 'Campus Communities', value: 18 },
  ]
  return (
    <section className="section counters-glass">
      <div className="container counters-grid">
        {counters.map(c => {
          const v = useCount(c.value)
          return (
            <div key={c.label} className="counter-card">
              <div className="counter-value">
                {v.toLocaleString()}{c.suffix || ''}
              </div>
              <div className="counter-label">{c.label}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * Safety (refined)
 * --------------------------------------------------------------------------- */
function Safety() {
  const items = [
    { icon: '🪪', title: 'Identity Signals', text: 'Institution & manual context reduce catfishing.' },
    { icon: '🧊', title: 'Cool Down Patterns', text: 'Encourages depth over blast DMs.' },
    { icon: '🛟', title: 'Report & Escalate', text: 'Quick pathways if something feels off.' },
    { icon: '🔐', title: 'Privacy Guardrails', text: 'Selective reveal of handles & info.' },
  ]
  return (
    <section className="section safety-modern">
      <div className="container">
        <div className="safety-head">
          <h2>Safety Baked In</h2>
          <p className="muted">Trust layers help you feel comfortable exploring connections.</p>
        </div>
        <div className="safety-cards">
          {items.map(i => (
            <div key={i.title} className="safety-card">
              <div className="safety-icon">{i.icon}</div>
              <h3>{i.title}</h3>
              <p>{i.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * Testimonials
 * --------------------------------------------------------------------------- */
interface Testimonial {
  rating: number
  text: string
  author: string
  role: string
  avatar: string
}
const TESTIMONIALS: Testimonial[] = [
  {
    rating: 5,
    text: 'Fewer profiles meant I actually read them. Quality uplift is real.',
    author: 'Simran',
    role: 'DTU',
    avatar: '/assets/av1.jpg'
  },
  {
    rating: 4,
    text: 'It feels intentional. I don’t doom scroll and burn out.',
    author: 'Arjun',
    role: 'IIT Delhi',
    avatar: '/assets/av2.jpg'
  },
  {
    rating: 5,
    text: 'Felt safe & respected, plus the UI is clean.',
    author: 'Karan',
    role: 'NSUT',
    avatar: '/assets/av3.jpg'
  },
  {
    rating: 5,
    text: 'Met people I now collaborate with. Not just matches—actual network.',
    author: 'Nisha',
    role: 'DU North',
    avatar: '/assets/av4.jpg'
  },
  {
    rating: 5,
    text: 'The round cadence keeps me engaged without overwhelm.',
    author: 'Manya',
    role: 'IIIT Delhi',
    avatar: '/assets/av5.jpg'
  },
]

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars-wrap" aria-label={`${rating} stars`}>
      {[0,1,2,3,4].map(i => <span key={i} className={`star ${i < rating ? 'on' : ''}`}>★</span>)}
    </span>
  )
}

function Testimonials() {
  const [list, setList] = useState(() => TESTIMONIALS)
  useEffect(() => {
    const id = setInterval(() => {
      setList(l => {
        const clone = [...l]
        const first = clone.shift()
        if (first) clone.push(first)
        return clone
      })
    }, 6500)
    return () => clearInterval(id)
  }, [])
  return (
    <section className="section testimonials-modern">
      <div className="container">
        <h2>What Students Say</h2>
        <div className="testimonials-grid">
          {list.slice(0,5).map(t => (
            <figure key={t.text} className="testimonial-item">
              <blockquote>{t.text}</blockquote>
              <figcaption>
                <img src={t.avatar} alt="" className="ti-avatar" />
                <div>
                  <div className="ti-name">{t.author}</div>
                  <div className="ti-role">{t.role}</div>
                  <Stars rating={t.rating} />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * FAQ
 * --------------------------------------------------------------------------- */
const FAQS = [
  {
    q: 'How are rounds curated?',
    a: 'We theme and cap them. Limited supply nudges thoughtfulness and reduces message spam.'
  },
  {
    q: 'Is my social handle public?',
    a: 'No—mutual interest first. This protects your privacy and lowers cold spam.'
  },
  {
    q: 'Do I have to be a student?',
    a: 'Yes right now. Academic affiliation adds a baseline trust layer for everyone.'
  },
  {
    q: 'Why not infinite swipes?',
    a: 'Because behavioral drain & novelty chasing reduce actual connection quality.'
  },
]

function FAQ() {
  return (
    <section className="section faq-modern">
      <div className="container">
        <h2>FAQ</h2>
        <div className="faq-items">
          {FAQS.map(f => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * Final CTA
 * --------------------------------------------------------------------------- */
function FinalCTA() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const go = () => {
    if (user) navigate('/dashboard')
    else navigate('/auth/signup')
  }
  return (
    <section className="section final-cta-modern">
      <div className="container final-cta-box">
        <div className="final-cta-text">
          <h2>Ready to meet someone authentic?</h2>
          <p>Join the next curated round—intentional discovery without the noise.</p>
          <button className="btn btn-primary btn-lg" onClick={go}>
            {user ? 'Enter Dashboard' : 'Join Now'}
          </button>
        </div>
        <div className="final-cta-art">
          <div className="cta-orb co-a" />
          <div className="cta-orb co-b" />
          <div className="cta-line" />
        </div>
      </div>
    </section>
  )
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
      <RoundsCarousel />
      <WhyItWorks />
      <Counters />
      <MetricsBand />
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