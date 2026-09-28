import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../state/AuthContext'
import { getInstallPrompt, isIOS, isStandalone, onInstallPromptChange } from '../../../utils/pwa'
import { openInstallSheet } from '../../AppExtras'
import './Landing.css'

/* Friends-first landing page sections (ld- prefix). */

function useJoin() {
  const { user, profile, login } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const go = async () => {
    if (user) { nav(profile?.isProfileComplete ? '/dashboard' : '/setup/profile'); return }
    setBusy(true)
    try {
      const isNew = await login()
      if (typeof isNew === 'boolean') nav(isNew ? '/setup/profile' : '/dashboard', { replace: true })
    } catch { } finally { setBusy(false) }
  }
  return { go, busy, signedIn: !!user }
}

/** Can this browser install DateU (or show how to)? */
function useCanInstall() {
  const [can, setCan] = useState(() => !isStandalone() && (!!getInstallPrompt() || isIOS() || /Android/i.test(navigator.userAgent)))
  useEffect(() => onInstallPromptChange(() => setCan(!isStandalone() && (!!getInstallPrompt() || isIOS() || /Android/i.test(navigator.userAgent)))), [])
  return can
}

const PEOPLE = [
  { n: 'Aanya', c: 'DU · North Campus', e: '🎨', t: ['Art', 'Chai', 'Indie music'], g: 'linear-gradient(135deg,#f472b6,#a855f7)' },
  { n: 'Rohan', c: 'IIT Delhi', e: '🏸', t: ['Badminton', 'Startups'], g: 'linear-gradient(135deg,#38bdf8,#6366f1)' },
  { n: 'Meher', c: 'Jamia', e: '📚', t: ['Books', 'Treks'], g: 'linear-gradient(135deg,#34d399,#0ea5e9)' },
]

export function LandingHero() {
  const { go, busy, signedIn } = useJoin()
  const canInstall = useCanInstall()
  return (
    <section className="ld-hero">
      <div className="ld-wrap ld-hero-grid">
        <div className="ld-hero-copy">
          <span className="ld-badge"><span className="ld-dot" /> Made for college students</span>
          <h1>Make new friends, <span>from every college.</span></h1>
          <p className="ld-lead">
            Meet students from any college who share your vibe — from your own campus or across the city. Go to fests and events together, and meet someone new on a quick voice call. Dating is there too — if you want it.
          </p>
          <div className="ld-ctas">
            <button type="button" className="ld-btn" onClick={go} disabled={busy}>
              {busy ? 'Signing in…' : signedIn ? 'Open DateU' : 'Start making friends'}
            </button>
            {canInstall ? (
              <button type="button" className="ld-btn ghost" onClick={openInstallSheet}>📲 Get the app</button>
            ) : (
              <a href="#how" className="ld-btn ghost">How it works</a>
            )}
          </div>
          <ul className="ld-trust">
            <li>✓ Free</li>
            <li>✓ Students only</li>
            <li>✓ Verified profiles</li>
          </ul>
        </div>

        <div className="ld-phone-wrap" aria-hidden="true">
          <div className="ld-float f1">🎪 Garba night · <b>48 going</b></div>
          <div className="ld-float f2">📞 <b>Aanya</b> is calling…</div>
          <div className="ld-float f3">👋 Rohan accepted your request</div>
          <div className="ld-phone">
            <div className="ld-notch" />
            <div className="ld-screen">
              <div className="ld-screen-head">
                <strong>Friends</strong>
                <span className="ld-seg"><i className="on">All colleges</i><i>Mine</i></span>
              </div>
              {PEOPLE.map((p) => (
                <div key={p.n} className="ld-person">
                  <span className="ld-avatar" style={{ background: p.g }}>{p.e}</span>
                  <span className="ld-person-text">
                    <b>{p.n}</b>
                    <small>{p.c}</small>
                    <span className="ld-mini-tags">{p.t.map((t) => <i key={t}>{t}</i>)}</span>
                  </span>
                  <span className="ld-hi">Say hi</span>
                </div>
              ))}
              <div className="ld-tabbar">
                <i className="on">👋</i><i>🎪</i><i>💬</i><i>💘</i><i>👤</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { e: '👋', h: 'Friends from any college', p: 'Browse students from every college — or just your own — see shared interests and send a friend request with a quick hello.', big: true },
  { e: '🎪', h: 'Events & fests', p: 'Find your garba partner, fest crew, trek buddy or hackathon team. See who’s going before you go.', big: true },
  { e: '📞', h: 'Quick voice calls', p: 'Talk to someone new for 5 minutes — voice only, no pressure. Both tap like and keep chatting.' },
  { e: '💬', h: 'Chat & calls with friends', p: 'Messages, voice notes and calls in one place, with read receipts you control.' },
  { e: '💘', h: 'Dating, if you want', p: 'Turn it on in the Dating tab for matching rounds — or never think about it.', tag: 'Optional' },
]

export function LandingFeatures() {
  return (
    <section className="ld-section" id="features">
      <div className="ld-wrap">
        <div className="ld-head">
          <span className="ld-eyebrow">One app for student life</span>
          <h2>Everything you need to meet new people</h2>
        </div>
        <div className="ld-features">
          {FEATURES.map((f) => (
            <div key={f.h} className={`ld-feature ${f.big ? 'big' : ''}`}>
              <span className="ld-feature-icon">{f.e}</span>
              <h3>{f.h} {f.tag && <em>{f.tag}</em>}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const EVENT_IDEAS = [
  { e: '💃', t: 'Find your Garba partner', s: 'Navratri nights', g: 'linear-gradient(135deg,#f43f5e,#f97316)' },
  { e: '🎪', t: 'Fest crew meetup', s: 'College fests', g: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { e: '🥾', t: 'Weekend trek buddies', s: 'Trips & treks', g: 'linear-gradient(135deg,#22c55e,#15803d)' },
  { e: '💻', t: 'Hackathon teammates', s: 'Build together', g: 'linear-gradient(135deg,#2563eb,#14b8a6)' },
  { e: '📚', t: 'Exam study group', s: 'Study buddies', g: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  { e: '🏏', t: 'Big match screening', s: 'Watch together', g: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
]

export function LandingEvents() {
  return (
    <section className="ld-section">
      <div className="ld-wrap">
        <div className="ld-head">
          <span className="ld-eyebrow">Events</span>
          <h2>Never go alone again</h2>
          <p>Tap “I’m going”, see who else is going, and find a partner or a group to go with.</p>
        </div>
      </div>
      <div className="ld-events" role="list">
        {EVENT_IDEAS.map((e) => (
          <div key={e.t} className="ld-event" role="listitem" style={{ background: e.g }}>
            <span className="ld-event-emoji" aria-hidden="true">{e.e}</span>
            <div className="ld-event-body">
              <small>{e.s}</small>
              <b>{e.t}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="ld-wrap ld-center">
        <Link to="/events" className="ld-btn ghost">See upcoming events →</Link>
      </div>
    </section>
  )
}

const STEPS = [
  { n: '1', h: 'Sign in with Google', p: 'Add a photo, your college and what you’re into. Takes about a minute.' },
  { n: '2', h: 'Say hi', p: 'Send a friend request, join an event or hop on a random voice call.' },
  { n: '3', h: 'Hang out', p: 'Chat, call and make plans — then meet up.' },
]

export function LandingSteps() {
  return (
    <section className="ld-section" id="how">
      <div className="ld-wrap">
        <div className="ld-head">
          <span className="ld-eyebrow">How it works</span>
          <h2>From new face to new friend</h2>
        </div>
        <ol className="ld-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="ld-step-n">{s.n}</span>
              <div><h3>{s.h}</h3><p>{s.p}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const SAFETY = [
  { e: '🎓', h: 'Students only', p: 'Verify your college ID for a badge — real people, real campuses.' },
  { e: '🙈', h: 'Private by default', p: 'Your phone number, email and Instagram are never shown on your profile.' },
  { e: '🚩', h: 'Report & block', p: 'One tap from any chat, call or profile. Our team reviews every report.' },
  { e: '🎧', h: 'Voice-only random calls', p: 'No video, no photos until you both choose to connect.' },
]

export function LandingSafety() {
  return (
    <section className="ld-section">
      <div className="ld-wrap">
        <div className="ld-head">
          <span className="ld-eyebrow">Safety</span>
          <h2>Friendly, and safe</h2>
        </div>
        <div className="ld-safety">
          {SAFETY.map((s) => (
            <div key={s.h} className="ld-safety-item">
              <span>{s.e}</span>
              <div><h3>{s.h}</h3><p>{s.p}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingInstall() {
  const canInstall = useCanInstall()
  const ios = isIOS()
  if (isStandalone()) return null
  return (
    <section className="ld-section">
      <div className="ld-wrap">
        <div className="ld-install">
          <img src="/icons/icon-192.png" alt="" width={72} height={72} />
          <div className="ld-install-text">
            <h2>Put DateU on your home screen</h2>
            <p>It works like an app — full screen, fast, with notifications. No app store needed.</p>
            <ul>
              {ios
                ? <><li>Open dateu.in in <b>Safari</b></li><li>Tap <b>Share</b> ⬆︎ → <b>Add to Home Screen</b></li></>
                : <><li>Open dateu.in in <b>Chrome</b> on your phone</li><li>Tap <b>Install</b> (or ⋮ → <b>Add to Home screen</b>)</li></>}
            </ul>
          </div>
          {canInstall && <button type="button" className="ld-btn" onClick={openInstallSheet}>📲 Install DateU</button>}
        </div>
      </div>
    </section>
  )
}

export function LandingFinal() {
  const { go, busy, signedIn } = useJoin()
  return (
    <section className="ld-section">
      <div className="ld-wrap">
        <div className="ld-final">
          <h2>Your next friend is one hello away 👋</h2>
          <p>Join free, say hi to new people, and never go to a fest alone again.</p>
          <button type="button" className="ld-btn" onClick={go} disabled={busy}>
            {busy ? 'Signing in…' : signedIn ? 'Open DateU' : 'Join DateU — it’s free'}
          </button>
        </div>
      </div>
    </section>
  )
}
