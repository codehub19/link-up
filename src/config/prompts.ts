/** Icebreaker prompts people can answer on their profile (shown on their profile card). */
export const PROFILE_PROMPTS = [
  'Best chai/coffee spot near campus',
  'A perfect Sunday looks like',
  'I’m looking for someone to',
  'Ask me about',
  'My go-to karaoke song',
  'Currently obsessed with',
  'The most underrated place in my city',
  'I’ll teach you ___ if you teach me ___',
  'Next trip I want to plan',
  'Unpopular opinion',
  'My hidden talent',
  'Fest I never miss',
  'Show I can rewatch forever',
  'We’ll get along if',
] as const

export type ProfilePrompt = { q: string; a: string }
export const MAX_PROMPTS = 3
export const PROMPT_ANSWER_MAX = 120

export function cleanPrompts(list: ProfilePrompt[] | undefined): ProfilePrompt[] {
  return (list || [])
    .map((p) => ({ q: String(p?.q || '').slice(0, 80), a: String(p?.a || '').trim().slice(0, PROMPT_ANSWER_MAX) }))
    .filter((p) => p.q && p.a)
    .slice(0, MAX_PROMPTS)
}

/**
 * Suggested first messages for someone, from what you have in common.
 * Used in the Say-hi sheet and in empty chats.
 */
export function suggestOpeners(me: { interests?: string[]; college?: string }, them: { name?: string; interests?: string[]; college?: string; prompts?: ProfilePrompt[] }, extra?: { event?: string }): string[] {
  const out: string[] = []
  const mine = new Set(me.interests || [])
  const shared = (them.interests || []).filter((i) => mine.has(i))
  if (extra?.event) out.push(`Hey! Saw you’re going to ${extra.event} too — want to go together?`)
  const prompt = (them.prompts || []).find((p) => p.a)
  if (prompt) out.push(`“${prompt.a.length > 40 ? prompt.a.slice(0, 40) + '…' : prompt.a}” — okay, I need to hear more about this 😄`)
  if (shared[0]) out.push(`Hey! Fellow ${shared[0]} person here — how did you get into it?`)
  if (shared[1]) out.push(`We both like ${shared[0]} and ${shared[1]}. Want to plan something this weekend?`)
  if (them.college && me.college && them.college === me.college) out.push(`Hey! Also at ${them.college} — which year are you in?`)
  else if (them.college) out.push(`Hi! What’s the best thing about ${them.college}?`)
  out.push('Hey! Up for a chai and a chat sometime this week?')
  return [...new Set(out)].slice(0, 3)
}
