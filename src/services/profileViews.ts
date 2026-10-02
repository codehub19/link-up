import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export type ProfileViews = {
  count: number
  premium: boolean
  /** Premium and not hiding their own views */
  canSee: boolean
  showViews: boolean
  viewers: { uid: string; name: string; photoUrl: string | null; avatar?: any; gender?: string | null; college: string | null; at: number }[]
}

const seen = new Set<string>()

/** Note that I opened someone's profile (once per session per person). */
export function recordProfileView(uid: string) {
  if (!uid || seen.has(uid)) return
  seen.add(uid)
  httpsCallable(functions, 'recordProfileView')({ uid }).catch(() => { })
}

export async function getProfileViews(): Promise<ProfileViews | null> {
  try {
    return (await httpsCallable(functions, 'getProfileViews')({})).data as ProfileViews
  } catch {
    return null
  }
}
