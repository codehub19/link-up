// Friendly, short labels for the profile answers stored as codes (from the setup questions)
const LABELS: Record<string, Record<string, string>> = {
  communicationImportance: {
    extremely: 'Extremely important',
    very: 'Very important',
    moderate: 'Moderately important',
    low: 'Actions > words',
  },
  conflictApproach: {
    address_immediately: 'Talk it out right away',
    cool_down: 'Cool down first',
    wait_other: 'Let them bring it up',
    avoid: 'Keep the peace',
  },
  sundayStyle: {
    relax_brunch: 'Sleep in & brunch',
    active_fitness: 'Gym or a run',
    personal_project: 'Learning something new',
    social_family: 'Friends & family',
  },
  travelPreference: {
    relaxing_resort: 'Beach & resorts',
    explore_city: 'Exploring new cities',
    active_adventure: 'Hiking & adventure',
    visit_family: 'Visiting loved ones',
  },
  lookingFor: {
    serious: 'Serious relationship',
    casual: 'Casual dating',
    friendship: 'Friendship',
    open: 'Open to anything',
    unsure: 'Not sure yet',
  },
  interestedIn: {
    men: 'Men',
    women: 'Women',
    everyone: 'Everyone',
  },
  datingPreference: {
    college_only: 'College students only',
    open_to_all: 'Everyone',
  },
  loveLanguage: {
    words: 'Words of affirmation',
    quality_time: 'Quality time',
    acts: 'Acts of service',
    touch: 'Physical touch',
    gifts: 'Receiving gifts',
  },
}

/** "quality_time" -> "Quality time"; unknown values are tidied up rather than shown raw. */
export function labelFor(field: string, value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return ''
  const v = String(value)
  const known = LABELS[field]?.[v]
  if (known) return known
  const tidy = v.replace(/_/g, ' ')
  return tidy.charAt(0).toUpperCase() + tidy.slice(1)
}

/** Heights are stored like 5'10 — show them as 5′10″. Numbers over 100 are treated as cm. */
export function formatHeight(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const n = Number(value)
    const inches = n > 100 ? Math.round(n / 2.54) : Math.round(n)
    return `${Math.floor(inches / 12)}′${inches % 12}″`
  }
  const [ft, inch] = String(value).split("'")
  return inch !== undefined ? `${ft}′${parseInt(inch) || 0}″` : String(value)
}
