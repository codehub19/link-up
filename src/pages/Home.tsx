import Navbar from '../components/Navbar'
import { useAuth } from '../state/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import React, { useEffect, useRef, useState } from 'react'
import './home.effects.css'
import MetricsBand from '../components/MetricsBand'

/** Subtle layered background: gradient mesh + tiny floating hearts */
function HomeBackground() {
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

/** Tiny heart burst on click anywhere within this layer */
function useHeartBurst() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    let blocked = false
    const handler = (e: MouseEvent) => {
      if (blocked) return
      blocked = true
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
      setTimeout(() => {
        el.remove()
        blocked = false
      }, 900)
    }
    c.addEventListener('click', handler)
    return () => c.removeEventListener('click', handler)
  }, [])
  return containerRef
}

/** Parallax hearts follow the cursor slightly for depth */
function useParallaxHearts() {
  useEffect(() => {
    const layer = document.querySelector<HTMLElement>('.hearts-layer')
    if (!layer) return
    let raf = 0
    let tx = 0, ty = 0
    let targetX = 0, targetY = 0
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      targetX = (e.clientX - cx) / 60
      targetY = (e.clientY - cy) / 60
      if (!raf) loop()
    }
    const loop = () => {
      tx += (targetX - tx) * 0.08
      ty += (targetY - ty) * 0.08
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
      if (Math.abs(targetX - tx) > 0.1 || Math.abs(targetY - ty) > 0.1) {
        raf = requestAnimationFrame(loop)
      } else {
        raf = 0
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

/** Intersection-based reveal for elements with [data-reveal] */
function useRevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('is-visible')),
      { threshold: 0.15 }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}

/** Magnetic effect for buttons */
function useMagnetic(ref: React.RefObject<HTMLElement>, strength = 16) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width - 0.5) * strength
      const y = ((e.clientY - r.top) / r.height - 0.5) * strength
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    const onLeave = () => { el.style.transform = 'translate(0,0)' }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [ref, strength])
}

/** Cursor spotlight inside a container */
function useSpotlight(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      el.style.setProperty('--spot-x', `${x}px`)
      el.style.setProperty('--spot-y', `${y}px`)
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [containerRef])
}

/** Lightweight 3D tilt wrapper with sheen */
function TiltCard({ className = '', children, max = 10 }: { className?: string; children: React.ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const rx = (py - 0.5) * -max
      const ry = (px - 0.5) * max
      el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
      el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
      el.style.setProperty('--px', `${px}`)
      el.style.setProperty('--py', `${py}`)
    }
    const reset = () => {
      el.style.setProperty('--rx', `0deg`)
      el.style.setProperty('--ry', `0deg`)
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', reset)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', reset)
    }
  }, [max])
  return (
    <div ref={ref} className={`tilt ${className}`} data-reveal>
      {children}
    </div>
  )
}

/** Drag-to-scroll row with arrow controls (kept for potential reuse) */
function CarouselRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    let isDown = false
    let startX = 0
    let scrollLeft = 0

    const onDown = (e: PointerEvent) => {
      isDown = true
      scroller.classList.add('dragging')
      startX = e.clientX
      scrollLeft = scroller.scrollLeft
      scroller.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!isDown) return
      scroller.scrollLeft = scrollLeft - (e.clientX - startX)
    }
    const onUp = (e: PointerEvent) => {
      isDown = false
      scroller.classList.remove('dragging')
      try { scroller.releasePointerCapture(e.pointerId) } catch {}
    }

    scroller.addEventListener('pointerdown', onDown)
    scroller.addEventListener('pointermove', onMove)
    scroller.addEventListener('pointerup', onUp)
    scroller.addEventListener('pointerleave', onUp)
    return () => {
      scroller.removeEventListener('pointerdown', onDown)
      scroller.removeEventListener('pointermove', onMove)
      scroller.removeEventListener('pointerup', onUp)
      scroller.removeEventListener('pointerleave', onUp)
    }
  }, [])

  const scrollBy = (dir: number) => {
    const scroller = ref.current
    if (!scroller) return
    scroller.scrollBy({ left: dir * Math.min(420, scroller.clientWidth * 0.9), behavior: 'smooth' })
  }

  return (
    <div className="carousel-wrap" data-reveal>
      <button className="arrow-btn left" aria-label="Scroll left" onClick={() => scrollBy(-1)}>‹</button>
      <div className="reviews-drag" ref={ref}>
        {children}
      </div>
      <button className="arrow-btn right" aria-label="Scroll right" onClick={() => scrollBy(1)}>›</button>
    </div>
  )
}

/** Count-up number that animates when visible (supports decimals) */
function CountUp({ to, suffix = '', duration = 1200, decimals = 0 }: { to: number; suffix?: string; duration?: number; decimals?: number }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let started = false
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !started) {
          started = true
          const start = performance.now()
          const animate = (t: number) => {
            const p = Math.min((t - start) / duration, 1)
            setV(p * to)
            if (p < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          io.disconnect()
        }
      })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])
  const value = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  return <span ref={ref}>{value}{suffix}</span>
}

/** Stars for ratings */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="rv-stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {[0,1,2,3,4].map(i => (
        <svg key={i} viewBox="0 0 24 24" className={`rv-star ${i < rating ? 'on' : ''}`} aria-hidden="true">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.25l-7.19-.62L12 2 9.19 8.63 2 9.25l5.46 4.72L5.82 21z"/>
        </svg>
      ))}
    </div>
  )
}

/** Horizontal marquee chips (swap with logos later) */
function CollegesMarquee() {
  const chips = ['IIT Delhi', 'DTU', 'IIIT Delhi', 'NSUT', 'DU North', 'DU South', 'JMI', 'IITM']
  return (
    <div className="marquee-wrap" aria-label="Participating colleges" data-reveal>
      <div className="marquee-track">
        {[...chips, ...chips].map((c, i) => (
          <span key={i} className="chip interactive-chip">{c}</span>
        ))}
      </div>
    </div>
  )
}

/** Phone swipe preview */
function SwipePreview() {
  const cards = [
    { name: 'Aisha, 20', bio: 'Design • Coffee • Indie', img: '/assets/demo1.jpg' },
    { name: 'Rohan, 21', bio: 'MMA • Startups • Rap', img: '/assets/demo2.jpg' },
    { name: 'Simran, 19', bio: 'Photography • Dance • Foodie', img: '/assets/demo3.jpg' },
  ]
  return (
    <div className="phone-demo" data-reveal>
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

/** Safety section (kept as-is) */
function SafetyGrid() {
  const items = [
    { title: 'Verified Profiles', desc: 'College verification and checks help keep LinkUp authentic.', iconId: 'g1' },
    { title: 'Report System', desc: 'Flag suspicious or harmful behavior quickly, right from the app.', iconId: 'g2' },
    { title: 'Privacy Controls', desc: 'Limit what you share and who can reach you with granular settings.', iconId: 'g3' },
    { title: 'Safety Guidelines', desc: 'Practical tips for online chat and IRL meets, built for students.', iconId: 'g4' },
  ]
  const Icon = ({ id }: { id: string }) => {
    switch (id) {
      case 'g1': return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="url(#g1)" strokeWidth="1.8"/><path d="M8 12l2.2 2.2L16 8.5" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="g1" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/></linearGradient></defs></svg>
      )
      case 'g2': return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l9 16H3L12 2z" stroke="url(#g2)" strokeWidth="1.8" fill="none"/><circle cx="12" cy="15.5" r="1" fill="#ff879d"/><path d="M12 9v4" stroke="url(#g2)" strokeWidth="2" strokeLinecap="round"/><defs><linearGradient id="g2" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/></linearGradient></defs></svg>
      )
      case 'g3': return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="url(#g3)" strokeWidth="1.8"/><path d="M8 10V8a4 4 0 018 0v2" stroke="url(#g3)" strokeWidth="1.8" strokeLinecap="round"/><defs><linearGradient id="g3" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/></linearGradient></defs></svg>
      )
      default: return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.4-2.9 8.4-7 9-4.1-.6-7-4.6-7-9V6l7-3z" stroke="url(#g4)" strokeWidth="1.8" fill="none"/><path d="M9 12l2 2 4-4" stroke="url(#g4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="g4" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff4b2b"/></linearGradient></defs></svg>
      )
    }
  }

  return (
    <section className="section safety-v2">
      <div className="container">
        <div className="safety-hero">
          <h2 className="safety-title-v2"><span>Your </span><span className="accent">Safety First</span></h2>
          <p className="safety-sub-v2">We prioritize your security with practical guidance and built-in safeguards.</p>
        </div>

        <div className="safety-grid-v2">
          {items.map((it) => (
            <article key={it.title} className="safety-item-v2" data-reveal>
              <div className="safety-ic-wrap" aria-hidden="true"><Icon id={it.iconId} /></div>
              <div className="safety-content">
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Top scroll progress bar */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const onScroll = () => {
      const h = document.documentElement
      const p = (h.scrollTop) / (h.scrollHeight - h.clientHeight)
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className="scroll-progress"><div className="scroll-progress-bar" ref={ref} /></div>
}

export default function Home() {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()

  const burstLayerRef = useHeartBurst()
  useParallaxHearts()
  useRevealOnScroll()

  const heroRef = useRef<HTMLDivElement | null>(null)
  useSpotlight(heroRef)

  const ctaRef = useRef<HTMLButtonElement | null>(null)
  useMagnetic(ctaRef, 18)

  const cta = async () => {
    if (user) {
      if (profile?.isProfileComplete) nav('/dashboard')
      else nav('/setup/gender')
      return
    }
    const isNew = await login()
    nav(isNew ? '/setup/gender' : '/dashboard')
  }

  const testimonials = [
    {
      rating: 5,
      text: 'Finally an app that actually cares about girls’ safety.',
      author: 'Simran',
      role: 'DTU',
      avatar: '/assets/av1.jpg'
    },
    {
      rating: 4,
      text: 'Clean UI and thoughtful rounds. Matches feel more intentional.',
      author: 'Arjun',
      role: 'IIT Delhi',
      avatar: '/assets/av2.jpg'
    },
    {
      rating: 5,
      text: 'Simple, respectful, and fun. Highly recommend.',
      author: 'Karan',
      role: 'NSUT',
      avatar: '/assets/av3.jpg'
    },
    {
      rating: 4,
      text: 'Loved the vibe. Met great people!',
      author: 'Nisha',
      role: 'DU North',
      avatar: '/assets/av4.jpg'
    },
    {
      rating: 5,
      text: 'Great onboarding and zero spam. Felt safe the whole time.',
      author: 'Manya',
      role: 'IIIT Delhi',
      avatar: '/assets/av5.jpg'
    },
  ]

  return (
    <>
      <Navbar />
      <ScrollProgress />
      <HomeBackground />
      <div className="home-burst-layer" ref={burstLayerRef} aria-hidden="true" />
      <header className="hero" ref={heroRef}>
        <div className="cursor-spotlight" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy" data-reveal>
            <h1 className="glow-title">Meaningful Connections, Made in College.</h1>
            <p className="sub">Curated rounds. No endless swiping. Safer, smarter, and just your vibe.</p>
            <div className="cta">
              <button className="btn primary magnet" ref={ctaRef} onClick={cta} data-reveal>
                {user ? 'Go to Dashboard' : 'Join Now'}
              </button>
              <a className="btn ghost" href="#how" data-reveal>How it Works</a>
            </div>
            <div className="trust-row" data-reveal>
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
          <h2 data-reveal>How it works</h2>
          <div className="how-grid">
            <TiltCard className="how-card">
              <div className="how-num">1</div>
              <h3>Create Your Profile</h3>
              <p>Onboard with Google. Add your photo, bio, and interests.</p>
            </TiltCard>
            <TiltCard className="how-card">
              <div className="how-num">2</div>
              <h3>Boys Join a Round</h3>
              <p>Enter curated rounds to be discovered by girls.</p>
            </TiltCard>
            <TiltCard className="how-card">
              <div className="how-num">3</div>
              <h3>Girls Choose</h3>
              <p>View a handful of profiles. Tap who you vibe with.</p>
            </TiltCard>
            <TiltCard className="how-card">
              <div className="how-num">4</div>
              <h3>Connect on Insta</h3>
              <p>Mutual likes reveal names and Insta IDs to both.</p>
            </TiltCard>
            <div className="how-connector" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <MetricsBand />

      {/* Safety */}
      <SafetyGrid />

      {/* Reviews (dark theme + full-width container like other sections) */}
      <section className="section reviews-section">
        <div className="container reviews-container">
          <h2 data-reveal>What Students Say</h2>
          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <article key={i} className="testimonial-card testimonial-dark" data-reveal>
                <div className="testimonial-stars"><Stars rating={t.rating} /></div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <img className="testimonial-avatar" src={t.avatar} alt={`${t.author} avatar`} />
                  <div className="testimonial-meta">
                    <div className="testimonial-name">{t.author}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="container">
          <h2 data-reveal>FAQ</h2>
          <div className="faq-list" data-reveal>
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
          <div className="cta-card interactive-card" data-reveal>
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