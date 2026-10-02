import {
  ACCESSORIES, AvatarConfig, BG, EYES, HAIR_COLOR, HAIR_STYLES, MOUTHS, SKIN, TOPS, TOP_COLOR, avatarDataUri, randomAvatar,
} from '../../utils/avatar'
import './AvatarEditor.css'

type Key = keyof Omit<AvatarConfig, 'v'>

const SECTIONS: { key: Key; label: string; colors?: string[]; names?: readonly string[] }[] = [
  { key: 'skin', label: 'Skin', colors: SKIN },
  { key: 'hair', label: 'Hair', names: HAIR_STYLES },
  { key: 'hairColor', label: 'Hair colour', colors: HAIR_COLOR },
  { key: 'eyes', label: 'Eyes', names: EYES },
  { key: 'mouth', label: 'Mouth', names: MOUTHS },
  { key: 'acc', label: 'Extras', names: ACCESSORIES },
  { key: 'top', label: 'Outfit', names: TOPS },
  { key: 'topColor', label: 'Outfit colour', colors: TOP_COLOR },
  { key: 'bg', label: 'Background', colors: BG },
]

/** Build your avatar: live preview, a few choices per part, and Shuffle. */
export default function AvatarEditor({ value, onChange, gender }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void; gender?: string | null }) {
  const set = (k: Key, v: number) => onChange({ ...value, [k]: v })
  return (
    <div className="ave">
      <div className="ave-preview">
        <img src={avatarDataUri(value)} alt="Your avatar" />
        <button type="button" className="ave-shuffle" onClick={() => onChange(randomAvatar(gender))}>🎲 Shuffle</button>
      </div>
      <div className="ave-sections">
        {SECTIONS.map((s) => (
          <div key={s.key} className="ave-row">
            <span className="ave-label">{s.label}</span>
            <div className="ave-options" role="radiogroup" aria-label={s.label}>
              {(s.colors || s.names || []).map((opt, i) => {
                const on = value[s.key] === i
                return s.colors ? (
                  <button key={i} type="button" role="radio" aria-checked={on} aria-label={`${s.label} ${i + 1}`}
                    className={`ave-swatch ${on ? 'on' : ''}`} style={{ background: opt as string }} onClick={() => set(s.key, i)} />
                ) : (
                  <button key={i} type="button" role="radio" aria-checked={on} className={`ave-chip ${on ? 'on' : ''}`} onClick={() => set(s.key, i)}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
