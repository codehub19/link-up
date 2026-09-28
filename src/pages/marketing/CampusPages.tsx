import { Link, Navigate, useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/home/Footer/Footer'
import HomeBackground from '../../components/home/HomeBackground'
import JoinButton from '../../components/home/JoinButton'
import campuses from '../../data/campuses.json'
import { SITE_URL, useSeo } from '../../utils/seo'
import './marketing.css'

type Campus = { slug: string; name: string; short: string; area: string }
const ALL = campuses as Campus[]

/** /campus — every college landing page, for people and for search engines. */
export function CampusIndexPage() {
  useSeo({
    title: 'Make Friends at College in Delhi NCR',
    description: 'Find DateU at your college — IIT Delhi, DU, JNU, DTU, NSUT, Jamia, Amity and more. Make new friends, find event buddies and meet verified students from your campus.',
    path: '/campus',
  })
  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <div className="mk-wrap">
          <span className="mk-eyebrow">Colleges</span>
          <h1>Friends from <span>every college</span></h1>
          <p className="mk-lead">
            DateU is built for college students. Pick your college to see how DateU works there — or just sign up
            and choose it during setup.
          </p>
          <div className="mk-chips">
            {ALL.map((c) => (
              <Link key={c.slug} to={`/campus/${c.slug}`} className="mk-chip">{c.short}</Link>
            ))}
          </div>
          <div className="mk-final">
            <h2>Don’t see your college?</h2>
            <p>DateU is open to students everywhere. Sign up, add your college, and invite friends to grow your campus.</p>
            <JoinButton />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/** /campus/:slug — "Make friends at <college>" landing page. */
export function CampusPage() {
  const { slug } = useParams()
  const c = ALL.find((x) => x.slug === slug)
  const faq = c ? [
    {
      q: `Is DateU only for ${c.short} students?`,
      a: `No. You can meet students from ${c.short} and from nearby colleges in ${c.area.split(',').pop()?.trim()} — switch between “My college” and “All colleges” in Friends.`,
    },
    {
      q: 'Is DateU free?',
      a: 'Yes. Friends, events, chat, voice calls and dating rounds are all free. Premium is optional — it puts you first and gives you more calls.',
    },
    {
      q: 'How do you verify students?',
      a: 'Students can upload their college ID, which our team checks by hand. Verified students get a blue badge. Your ID is never shown on your profile.',
    },
    {
      q: 'Is it safe?',
      a: 'Random calls are voice-only with no photos, you can block or report anyone in one tap, and our team reviews every report. Your phone number and email are never shown to other users.',
    },
  ] : []

  useSeo({
    title: c ? `Make Friends at ${c.short} – Meet ${c.short} Students` : 'College not found',
    description: c
      ? `New at ${c.name} or want to widen your circle? DateU helps you make friends with verified students from ${c.short} and nearby colleges — find study buddies, event partners and people to hang out with.`
      : undefined,
    path: c ? `/campus/${c.slug}` : undefined,
    noindex: !c,
    jsonLd: c ? {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Colleges', item: `${SITE_URL}/campus` },
            { '@type': 'ListItem', position: 3, name: c.short, item: `${SITE_URL}/campus/${c.slug}` },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
      ],
    } : undefined,
  })

  if (!c) return <Navigate to="/campus" replace />

  const nearby = ALL.filter((x) => x.slug !== c.slug && x.area.split(',').pop()?.trim() === c.area.split(',').pop()?.trim()).slice(0, 8)
  const others = nearby.length >= 4 ? nearby : ALL.filter((x) => x.slug !== c.slug).slice(0, 8)

  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <div className="mk-wrap">
          <nav className="mk-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> › <Link to="/campus">Colleges</Link> › {c.short}
          </nav>
          <span className="mk-eyebrow">{c.area}</span>
          <h1>Make friends at <span>{c.short}</span></h1>
          <p className="mk-lead">
            Meet genuine, verified students from {c.name} and every other college. Find people who share your interests,
            go to fests and events together, and talk on quick voice calls. Dating is there too, if you want it.
          </p>
          <div className="mk-cta-row">
            <JoinButton label={`Join DateU at ${c.short}`} />
            <Link to="/#how-it-works" className="mk-btn ghost">How it works</Link>
          </div>

          <div className="mk-grid">
            <div className="mk-card">
              <div className="mk-card-icon">🎓</div>
              <h3>Verified students</h3>
              <p>Upload your {c.short} ID once to get a verified badge, so people know you’re a real student.</p>
            </div>
            <div className="mk-card">
              <div className="mk-card-icon">👋</div>
              <h3>Friends from every college</h3>
              <p>Browse students from {c.short} and every other college who share your interests, and send a friend request with a quick hello.</p>
            </div>
            <div className="mk-card">
              <div className="mk-card-icon">📞</div>
              <h3>5-minute voice calls</h3>
              <p>Talk to someone new — no photos, no pressure. If you both tap like, you can keep chatting.</p>
            </div>
          </div>

          <h2>How DateU works at {c.short}</h2>
          <div className="mk-prose">
            <ol>
              <li><strong>Sign up with Google</strong> and pick {c.name} as your college.</li>
              <li><strong>Build your profile</strong> — a few photos, a short bio and your interests.</li>
              <li><strong>Say hi</strong> to students from {c.short} or any other college, join an event, or start a random voice call any time.</li>
              <li><strong>Hang out.</strong> Chat, make plans and meet up near {c.area.split(',')[0]}.</li>
            </ol>
          </div>

          <h2>Questions from {c.short} students</h2>
          <div className="mk-faq">
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <h2>Nearby colleges on DateU</h2>
          <div className="mk-chips">
            {others.map((x) => <Link key={x.slug} to={`/campus/${x.slug}`} className="mk-chip">{x.short}</Link>)}
            <Link to="/campus" className="mk-chip">All colleges →</Link>
          </div>

          <div className="mk-final">
            <h2>Your campus, your people.</h2>
            <p>Join free and meet new people at {c.short}.</p>
            <JoinButton />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
