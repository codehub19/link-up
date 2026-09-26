// Writes public/sitemap.xml from the public routes, college pages and blog posts.
// Runs before every build (see "prebuild" in package.json).
import { readFileSync, writeFileSync } from 'node:fs'

const SITE = 'https://dateu.in'
const today = new Date().toISOString().slice(0, 10)
const campuses = JSON.parse(readFileSync(new URL('../src/data/campuses.json', import.meta.url)))
const posts = JSON.parse(readFileSync(new URL('../src/data/blog.json', import.meta.url)))

const pages = [
  ['/', '1.0', 'weekly'],
  ['/rounds', '0.8', 'monthly'],
  ['/pricing', '0.7', 'monthly'],
  ['/campus', '0.8', 'weekly'],
  ['/blog', '0.7', 'weekly'],
  ['/about', '0.6', 'monthly'],
  ['/download', '0.6', 'monthly'],
  ['/support', '0.5', 'monthly'],
  ['/contact', '0.5', 'yearly'],
  ['/careers', '0.4', 'monthly'],
  ['/success-stories', '0.4', 'monthly'],
  ['/legal/guidelines', '0.4', 'yearly'],
  ['/legal/terms', '0.3', 'yearly'],
  ['/legal/privacy', '0.3', 'yearly'],
  ['/legal/refunds', '0.3', 'yearly'],
  ['/legal/delivery', '0.2', 'yearly'],
  ['/legal/security', '0.2', 'yearly'],
  ...campuses.map((c) => [`/campus/${c.slug}`, '0.7', 'monthly']),
  ...posts.map((p) => [`/blog/${p.slug}`, '0.6', 'yearly', p.date]),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([path, priority, freq, lastmod]) => `  <url><loc>${SITE}${path}</loc><lastmod>${lastmod || today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join('\n')}
</urlset>
`
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml)
console.log(`sitemap.xml: ${pages.length} URLs`)
