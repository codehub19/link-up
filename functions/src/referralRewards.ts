import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { grantPremiumDays } from './premium'
import { sendPushToUsers } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

// Defaults; admins can change them in Admin → Controls (config/app)
const DEFAULT_REWARD_DAYS = 3
const DEFAULT_MAX_REWARDS_PER_REFERRER = 10

/**
 * Two-sided referral reward: when someone who signed up with a referral code
 * finishes their profile (with a photo), both they and the person who invited
 * them get a few days of Premium. Rewarded once per new user, capped per
 * referrer, and it can be switched off by setting the days to 0.
 */
export const onReferralProfileComplete = onDocumentUpdated(
  { document: 'users/{uid}', region: 'asia-south2' },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    const uid = event.params.uid
    if (!after || before?.isProfileComplete === true || after.isProfileComplete !== true) return
    if (!after.photoUrl) return

    const refRef = db.collection('referrals').doc(uid)
    const cfg = (await db.collection('config').doc('app').get()).data() || {}
    const days = Number.isFinite(cfg.referralRewardDays) ? Number(cfg.referralRewardDays) : DEFAULT_REWARD_DAYS
    const cap = Number.isFinite(cfg.referralMaxRewards) ? Number(cfg.referralMaxRewards) : DEFAULT_MAX_REWARDS_PER_REFERRER
    if (days <= 0) return

    // Claim the reward in a transaction so it can only happen once
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(refRef)
      if (!snap.exists) return null
      const r = snap.data()!
      if (r.rewardGranted || !r.referrerUid || r.referrerUid === uid) return null
      tx.update(refRef, { rewardGranted: true, rewardDays: days, rewardAt: admin.firestore.FieldValue.serverTimestamp() })
      return r.referrerUid as string
    })
    if (!claim) return

    const referrerSnap = await db.collection('users').doc(claim).get()
    if (!referrerSnap.exists || referrerSnap.get('banned') === true) {
      await grantPremiumDays(uid, 'referral_bonus', days, { grantedByReferral: true })
      return
    }

    const alreadyRewarded = (await db.collection('referrals')
      .where('referrerUid', '==', claim).where('rewardGranted', '==', true).count().get()).data().count
    const referrerGetsReward = alreadyRewarded <= cap // includes this one

    await grantPremiumDays(uid, 'referral_bonus', days, { grantedByReferral: true })
    if (referrerGetsReward) await grantPremiumDays(claim, 'referral_bonus', days, { grantedByReferral: true })

    const name = (after.name || 'Your friend').split(' ')[0]
    await Promise.all([
      db.collection('notifications').add({
        userUid: uid, title: `🎁 ${days} days of Premium unlocked`,
        body: 'Thanks for joining with a friend’s code — you’re shown first in rounds for the next few days.',
        createdAt: admin.firestore.FieldValue.serverTimestamp(), seen: false, targetType: 'personal',
      }),
      referrerGetsReward && db.collection('notifications').add({
        userUid: claim, title: `🎁 ${name} joined — you both got ${days} days of Premium`,
        body: 'Keep inviting friends to earn more Premium days.',
        createdAt: admin.firestore.FieldValue.serverTimestamp(), seen: false, targetType: 'personal',
      }),
    ])
    await sendPushToUsers(referrerGetsReward ? [uid, claim] : [uid], '🎁 Free Premium unlocked', `${days} days of Premium added to your account`, '/dashboard/notifications').catch(() => 0)
    logger.info('Referral reward granted', { uid, referrer: claim, days, referrerGetsReward })
  },
)
