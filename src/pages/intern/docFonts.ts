import { useEffect } from 'react'

/** Fonts used on letters and certificates (loaded only on those pages). */
export function useDocFonts() {
  useEffect(() => {
    if (document.getElementById('doc-fonts')) return
    const l = document.createElement('link')
    l.id = 'doc-fonts'
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&display=swap'
    document.head.appendChild(l)
  }, [])
}
