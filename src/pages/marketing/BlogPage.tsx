import { Link, Navigate, useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/home/Footer/Footer'
import HomeBackground from '../../components/home/HomeBackground'
import JoinButton from '../../components/home/JoinButton'
import posts from '../../data/blog.json'
import { SITE_URL, useSeo } from '../../utils/seo'
import './marketing.css'

type Block = [string, string | string[]]
type Post = { slug: string; title: string; description: string; tag: string; date: string; minutes: number; blocks: Block[] }
const ALL = posts as Post[]

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

/** /blog — list of articles. */
export default function BlogPage() {
  useSeo({
    title: 'Blog – Dating & Campus Life Tips for Students',
    description: 'Tips on meeting people in college, staying safe on dating apps, better profiles and first-date ideas — from the DateU team.',
    path: '/blog',
  })
  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <div className="mk-wrap">
          <span className="mk-eyebrow">Blog</span>
          <h1>The DateU <span>Blog</span></h1>
          <p className="mk-lead">Dating and campus-life tips for students.</p>
          <div className="mk-grid">
            {ALL.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="mk-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="mk-eyebrow" style={{ marginBottom: 0 }}>{p.tag}</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <p style={{ marginTop: 10, fontSize: '0.82rem' }}>{p.minutes} min read</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/** /blog/:slug — one article. */
export function BlogPostPage() {
  const { slug } = useParams()
  const post = ALL.find((p) => p.slug === slug)
  useSeo({
    title: post?.title,
    description: post?.description,
    path: post ? `/blog/${post.slug}` : undefined,
    noindex: !post,
    jsonLd: post ? {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: 'en-IN',
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
      image: `${SITE_URL}/og-image.png`,
      author: { '@type': 'Organization', name: 'DateU' },
      publisher: { '@type': 'Organization', name: 'DateU', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } },
    } : undefined,
  })
  if (!post) return <Navigate to="/blog" replace />

  const more = ALL.filter((p) => p.slug !== post.slug).slice(0, 3)
  return (
    <>
      <HomeBackground />
      <Navbar />
      <main className="mk">
        <article className="mk-wrap" style={{ maxWidth: 720 }}>
          <nav className="mk-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> › <Link to="/blog">Blog</Link>
          </nav>
          <span className="mk-eyebrow">{post.tag}</span>
          <h1>{post.title}</h1>
          <div className="mk-meta">{fmtDate(post.date)} · {post.minutes} min read</div>
          <div className="mk-prose">
            {post.blocks.map(([type, content], i) => {
              if (type === 'h2') return <h2 key={i}>{content as string}</h2>
              if (type === 'ul') return <ul key={i}>{(content as string[]).map((li) => <li key={li}>{li}</li>)}</ul>
              if (type === 'ol') return <ol key={i}>{(content as string[]).map((li) => <li key={li}>{li}</li>)}</ol>
              return <p key={i}>{content as string}</p>
            })}
          </div>

          <div className="mk-final">
            <h2>Meet people from your campus</h2>
            <p>Free matching rounds, 5-minute voice calls and chat — made for college students.</p>
            <JoinButton />
          </div>

          <h2>Keep reading</h2>
          <div className="mk-grid" style={{ marginTop: 0 }}>
            {more.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="mk-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ marginTop: 0 }}>{p.title}</h3>
                <p>{p.minutes} min read</p>
              </Link>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
