/*
 * Illustrated avatars for people who don't want to show a photo in Friends.
 *
 * An avatar is a handful of small numbers (stored on the profile as `avatar`) that
 * this file draws as an SVG. Nothing is uploaded, so an avatar can't carry an
 * inappropriate picture, and the database rules check every value is in range.
 * Dating still needs real photos (see hasRealPhoto).
 */

export type AvatarConfig = {
  v: 1
  skin: number
  hair: number
  hairColor: number
  eyes: number
  mouth: number
  acc: number
  top: number
  topColor: number
  bg: number
}

export const SKIN = ['#f7d7c0', '#eebf9c', '#d9a07a', '#c08259', '#9a6342', '#704630']
export const HAIR_COLOR = ['#1d1916', '#3d2a1f', '#6b4630', '#8e3a22', '#c99a4a', '#a3a3a3', '#3b5bdb', '#d6336c']
export const TOP_COLOR = ['#ff416c', '#7c5cff', '#22b8cf', '#20c997', '#fab005', '#fd7e14', '#495057', '#f8f9fa']
export const BG = ['#ffe3ec', '#e5dbff', '#d0ebff', '#d3f9d8', '#fff3bf', '#ffe8cc', '#2b2a33', '#f1f3f5']

export const HAIR_STYLES = ['Short', 'Buzz', 'Side part', 'Curly', 'Long', 'Bun', 'Ponytail', 'Wavy', 'Bob', 'None'] as const
export const EYES = ['Calm', 'Happy', 'Wink', 'Bright'] as const
export const MOUTHS = ['Smile', 'Grin', 'Oh', 'Chill'] as const
export const ACCESSORIES = ['None', 'Glasses', 'Shades', 'Earrings', 'Cap'] as const
export const TOPS = ['Tee', 'Hoodie', 'Collar', 'Kurta'] as const

/** How many choices each part has (also used by firestore.rules: keep in sync). */
export const AVATAR_LIMITS = {
  skin: SKIN.length, hair: HAIR_STYLES.length, hairColor: HAIR_COLOR.length, eyes: EYES.length,
  mouth: MOUTHS.length, acc: ACCESSORIES.length, top: TOPS.length, topColor: TOP_COLOR.length, bg: BG.length,
} as const

const MALE_HAIR = [0, 1, 2, 3]
const FEMALE_HAIR = [4, 5, 6, 7, 8]

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A friendly default based on gender, stable for the same person. */
export function defaultAvatar(seed = 'dateu', gender?: string | null): AvatarConfig {
  let h = hash(seed || 'dateu')
  const pick = (n: number) => { const v = h % n; h = (Math.floor(h / n) ^ (h << 7)) >>> 0; return v }
  const hairPool = gender === 'male' ? MALE_HAIR : gender === 'female' ? FEMALE_HAIR : [0, 2, 3, 4, 8]
  return {
    v: 1,
    skin: 1 + pick(4),
    hair: hairPool[pick(hairPool.length)],
    hairColor: pick(3),
    eyes: pick(2),
    mouth: pick(2),
    acc: gender === 'female' && pick(3) === 0 ? 3 : 0,
    top: pick(3),
    topColor: pick(6),
    bg: pick(6),
  }
}

export function randomAvatar(gender?: string | null): AvatarConfig {
  return defaultAvatar(`${Math.random()}`, gender)
}

/** Clamp anything stored/received into a valid config. */
export function normalizeAvatar(a: any, seed?: string, gender?: string | null): AvatarConfig {
  const d = defaultAvatar(seed, gender)
  if (!a || typeof a !== 'object') return d
  const out: any = { v: 1 }
  for (const k of Object.keys(AVATAR_LIMITS) as (keyof typeof AVATAR_LIMITS)[]) {
    const n = Number(a[k])
    out[k] = Number.isInteger(n) && n >= 0 && n < AVATAR_LIMITS[k] ? n : (d as any)[k]
  }
  return out
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (x: number) => Math.max(0, Math.min(255, x + amt))
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

/* Hair drawn behind the head (long styles) and in front of it */
function hairBack(style: number, color: string) {
  switch (style) {
    case 4: return `<path d="M58 92 C55 44 80 32 100 32 C121 32 145 44 142 92 L148 166 C120 172 80 172 52 166 Z" fill="${color}"/>`
    case 6: return `<path d="M134 70 C162 82 164 128 148 150 C140 128 138 104 128 90 Z" fill="${color}"/>`
    case 7: return `<path d="M56 94 C48 44 82 30 100 30 C120 30 152 44 144 94 C154 114 140 132 152 156 C120 166 80 166 48 156 C60 132 46 114 56 94 Z" fill="${color}"/>`
    case 8: return `<path d="M58 92 C55 46 82 34 100 34 C120 34 145 46 142 92 L144 124 C126 130 74 130 56 124 Z" fill="${color}"/>`
    default: return ''
  }
}
function hairFront(style: number, color: string) {
  switch (style) {
    case 0: return `<path d="M63 86 C60 52 82 40 100 40 C121 40 141 52 137 86 C131 70 118 61 100 61 C84 61 70 70 63 86 Z" fill="${color}"/>`
    case 1: return `<path d="M65 80 C66 55 84 45 100 45 C118 45 135 55 135 80 C128 68 116 61 100 61 C85 61 72 68 65 80 Z" fill="${color}" opacity=".85"/>`
    case 2: return `<path d="M62 90 C56 50 84 37 105 39 C129 41 143 58 138 90 C135 73 127 64 113 59 C100 67 81 70 62 90 Z" fill="${color}"/>`
    case 3: return `<g fill="${color}"><circle cx="70" cy="70" r="12"/><circle cx="82" cy="56" r="13"/><circle cx="100" cy="50" r="14"/><circle cx="118" cy="56" r="13"/><circle cx="130" cy="70" r="12"/><circle cx="67" cy="83" r="8"/><circle cx="133" cy="83" r="8"/></g>`
    case 4: case 7: case 8: return `<path d="M63 88 C60 52 82 41 100 41 C120 41 140 52 137 88 C124 66 108 59 93 61 C80 63 70 72 63 88 Z" fill="${color}"/>`
    case 5: return `<g fill="${color}"><circle cx="100" cy="36" r="15"/><path d="M63 84 C61 54 82 43 100 43 C120 43 139 54 137 84 C128 68 116 61 100 61 C84 61 71 68 63 84 Z"/></g>`
    case 6: return `<path d="M63 86 C61 52 82 41 100 41 C121 41 140 52 137 86 C127 67 112 60 98 60 C84 61 71 70 63 86 Z" fill="${color}"/>`
    default: return ''
  }
}
function eyes(kind: number) {
  const ink = '#2b2228'
  switch (kind) {
    case 1: return `<g stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M80 93 Q86 87 92 93"/><path d="M108 93 Q114 87 120 93"/></g>`
    case 2: return `<g><circle cx="86" cy="92" r="3.8" fill="${ink}"/><path d="M108 93 Q114 88 120 93" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>`
    case 3: return `<g><circle cx="86" cy="92" r="5.2" fill="${ink}"/><circle cx="114" cy="92" r="5.2" fill="${ink}"/><circle cx="87.8" cy="90.2" r="1.7" fill="#fff"/><circle cx="115.8" cy="90.2" r="1.7" fill="#fff"/></g>`
    default: return `<g fill="${ink}"><circle cx="86" cy="92" r="3.8"/><circle cx="114" cy="92" r="3.8"/></g>`
  }
}
function mouth(kind: number) {
  const ink = '#7a2e3a'
  switch (kind) {
    case 1: return `<path d="M88 107 Q100 121 112 107 Z" fill="${ink}"/><path d="M91 108 Q100 112 109 108" stroke="#fff" stroke-width="2" fill="none"/>`
    case 2: return `<ellipse cx="100" cy="111" rx="4.5" ry="5.5" fill="${ink}"/>`
    case 3: return `<path d="M91 110 Q100 113 109 109" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    default: return `<path d="M89 107 Q100 117 111 107" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
  }
}
function accessory(kind: number, topColor: string) {
  switch (kind) {
    case 1: return `<g stroke="#2b2228" stroke-width="2.6" fill="rgba(255,255,255,.18)"><rect x="73" y="83" width="24" height="18" rx="7"/><rect x="103" y="83" width="24" height="18" rx="7"/><path d="M97 91 L103 91" fill="none"/></g>`
    case 2: return `<g fill="#1d1b22"><rect x="72" y="83" width="26" height="17" rx="7"/><rect x="102" y="83" width="26" height="17" rx="7"/><rect x="96" y="88" width="8" height="3"/></g>`
    case 3: return `<g fill="#f5c542"><circle cx="64" cy="106" r="3.5"/><circle cx="136" cy="106" r="3.5"/></g>`
    case 4: return `<g><path d="M62 74 C62 46 82 36 100 36 C120 36 138 46 138 74 Z" fill="${topColor}"/><path d="M98 72 C120 70 146 72 156 80 C140 82 118 80 98 78 Z" fill="${shade(topColor, -40)}"/></g>`
    default: return ''
  }
}
function top(kind: number, color: string, skin: string) {
  const dark = shade(color, -35)
  const body = `<path d="M28 200 C28 152 60 136 100 136 C140 136 172 152 172 200 Z" fill="${color}"/>`
  switch (kind) {
    case 1: return body + `<path d="M70 140 C76 160 124 160 130 140 C122 148 78 148 70 140 Z" fill="${dark}"/><path d="M92 156 L92 178 M108 156 L108 178" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`
    case 2: return body + `<path d="M84 136 L100 156 L116 136 Z" fill="#fff"/><path d="M100 156 L100 200" stroke="${dark}" stroke-width="2"/>`
    case 3: return body + `<path d="M100 140 L100 192" stroke="${dark}" stroke-width="2.4"/><g fill="${dark}"><circle cx="100" cy="152" r="2.4"/><circle cx="100" cy="164" r="2.4"/><circle cx="100" cy="176" r="2.4"/></g>`
    default: return body + `<path d="M84 137 Q100 150 116 137" stroke="${skin}" stroke-width="7" fill="none"/>`
  }
}

/** The avatar as SVG markup (200×200). */
export function avatarSvg(a: AvatarConfig) {
  const skin = SKIN[a.skin], hair = HAIR_COLOR[a.hairColor], tc = TOP_COLOR[a.topColor]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">`
    + `<rect width="200" height="200" fill="${BG[a.bg]}"/>`
    + hairBack(a.hair, hair)
    + `<rect x="86" y="112" width="28" height="30" rx="10" fill="${shade(skin, -18)}"/>`
    + top(a.top, tc, shade(skin, -18))
    + `<circle cx="64" cy="94" r="8" fill="${shade(skin, -10)}"/><circle cx="136" cy="94" r="8" fill="${shade(skin, -10)}"/>`
    + `<ellipse cx="100" cy="89" rx="36" ry="42" fill="${skin}"/>`
    + `<g fill="${shade(skin, -40)}" opacity=".55"><ellipse cx="79" cy="104" rx="6" ry="3.5"/><ellipse cx="121" cy="104" rx="6" ry="3.5"/></g>`
    + `<g stroke="${a.hair === 9 ? '#2b2228' : shade(hair, -10)}" stroke-width="3.2" stroke-linecap="round"><path d="M78 80 L92 78"/><path d="M108 78 L122 80"/></g>`
    + eyes(a.eyes) + mouth(a.mouth)
    + hairFront(a.hair, hair)
    + accessory(a.acc, tc)
    + `</svg>`
}

const cache = new Map<string, string>()
export function avatarDataUri(a: AvatarConfig) {
  const key = JSON.stringify(a)
  let uri = cache.get(key)
  if (!uri) {
    uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(a))
    if (cache.size > 300) cache.clear()
    cache.set(key, uri)
  }
  return uri
}

type PersonLike = { uid?: string | null; name?: string | null; gender?: string | null; photoUrl?: string | null; avatar?: any } | null | undefined

/** The picture to show for someone: their photo, or their avatar if they have none. */
export function photoOf(p: PersonLike): string {
  if (p?.photoUrl) return p.photoUrl
  return avatarDataUri(normalizeAvatar(p?.avatar, String(p?.uid || p?.name || 'dateu'), p?.gender))
}

/** A real uploaded photo (needed for dating). Google account pictures and avatars don't count. */
export function hasRealPhoto(p: { photoUrl?: string | null; photoUrls?: string[] | null } | null | undefined) {
  if (!p) return false
  if (Array.isArray(p.photoUrls) && p.photoUrls.some((u) => typeof u === 'string' && /firebasestorage\.googleapis\.com|\/o\/users%2F/.test(u))) return true
  return typeof p.photoUrl === 'string' && /firebasestorage\.googleapis\.com|\/o\/users%2F/.test(p.photoUrl)
}
