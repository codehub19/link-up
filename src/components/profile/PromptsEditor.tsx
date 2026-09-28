import { MAX_PROMPTS, PROFILE_PROMPTS, PROMPT_ANSWER_MAX, ProfilePrompt } from '../../config/prompts'
import './PromptsEditor.css'

/** Pick up to 3 icebreaker prompts and answer them. */
export default function PromptsEditor({ value, onChange }: { value: ProfilePrompt[]; onChange: (v: ProfilePrompt[]) => void }) {
  const used = new Set(value.map((p) => p.q))
  const set = (i: number, patch: Partial<ProfilePrompt>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <div className="pe">
      {value.map((p, i) => (
        <div key={i} className="pe-item">
          <div className="pe-row">
            <select value={p.q} onChange={(e) => set(i, { q: e.target.value })} aria-label="Prompt">
              {PROFILE_PROMPTS.filter((q) => q === p.q || !used.has(q)).map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <button type="button" className="pe-remove" aria-label="Remove prompt" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea
            rows={2}
            maxLength={PROMPT_ANSWER_MAX}
            placeholder="Your answer…"
            value={p.a}
            onChange={(e) => set(i, { a: e.target.value })}
          />
          <small>{p.a.length}/{PROMPT_ANSWER_MAX}</small>
        </div>
      ))}
      {value.length < MAX_PROMPTS && (
        <button
          type="button"
          className="pe-add"
          onClick={() => onChange([...value, { q: PROFILE_PROMPTS.find((q) => !used.has(q)) || PROFILE_PROMPTS[0], a: '' }])}
        >
          + Add a prompt
        </button>
      )}
    </div>
  )
}
