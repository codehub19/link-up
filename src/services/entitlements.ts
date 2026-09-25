import { getActiveSubscription } from './subscriptions'
import { getActiveRound } from './rounds'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export type MaleEntitlement = {
  inActiveRound: boolean
  /** Active Premium (time-based). Rounds are free; Premium gives priority. */
  hasActiveSubscription: boolean
}

export async function getMaleEntitlement(uid: string): Promise<MaleEntitlement> {
  const sub = await getActiveSubscription(uid)
  const hasActiveSubscription = !!sub
  let inActiveRound = false
  try {
    const active = await getActiveRound()
    if (active?.id) {
      const roundSnap = await getDoc(doc(db, 'matchingRounds', active.id))
      const males: string[] = (roundSnap.data() as any)?.participatingMales || []
      inActiveRound = males.includes(uid)
    }
  } catch {}
  return {
    inActiveRound,
    hasActiveSubscription,
  }
}