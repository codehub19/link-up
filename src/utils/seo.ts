import { useEffect } from 'react'

export const SITE_URL = 'https://dateu.in'
const DEFAULT_TITLE = 'DateU – Campus Dating for Verified College Students in India'
const DEFAULT_DESC = 'DateU is a campus dating app for verified college students in India. Join free matching rounds, meet new people on 5-minute voice calls, and chat with your matches.'

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

function setJsonLd(id: string, data?: object) {
  const existing = document.getElementById(id)
  if (!data) { existing?.remove(); return }
  const el = existing || Object.assign(document.createElement('script'), { id, type: 'application/ld+json' })
  el.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(el)
}

/**
 * Per-page title, description, canonical URL and (optionally) structured data.
 * Google runs JavaScript, so it sees these. Pages restore the defaults when
 * they unmount so app screens never keep a stale title.
 */
export function useSeo({ title, description, path, noindex, jsonLd }: {
  title?: string
  description?: string
  path?: string
  noindex?: boolean
  jsonLd?: object
}) {
  const json = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    const fullTitle = title ? `${title} | DateU` : DEFAULT_TITLE
    const desc = description || DEFAULT_DESC
    const url = SITE_URL + (path ?? window.location.pathname)
    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    setCanonical(url)
    setJsonLd('page-jsonld', json ? JSON.parse(json) : undefined)
    return () => {
      document.title = DEFAULT_TITLE
      setMeta('name', 'description', DEFAULT_DESC)
      setMeta('name', 'robots', 'index, follow, max-image-preview:large')
      setJsonLd('page-jsonld', undefined)
    }
  }, [title, description, path, noindex, json])
}
