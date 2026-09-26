import React from 'react'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProfileTab from '../ProfileTab'
import '../dashboard.css'
import './Profile.styles.css'

import { getReferralStats, assignReferralCode } from '../../../services/referrals'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { profile } = useAuth()
  return <ProfileTab referral={<ReferralCard user={profile} />} />
}

import { collection, onSnapshot, query, where, doc } from 'firebase/firestore'
import { db } from '../../../firebase'

function ReferralCard({ user }: { user: any }) {
  const [stats, setStats] = React.useState<any>(null)
  const [isReferralPending, setIsReferralPending] = React.useState(false)
  const { refreshProfile } = useAuth()
  const nav = useNavigate()

  React.useEffect(() => {
    if (user?.uid) {
      getReferralStats(user.uid).then(setStats)
      if (!user.referralCode) {
        assignReferralCode(user.uid, user.name || 'User')
          .then(() => refreshProfile())
          .catch(console.error)
      }

      // Listen for pending referral usage
      const qy = query(collection(db, 'payments'), where('uid', '==', user.uid))
      const unsub = onSnapshot(qy, (snap) => {
        let hasPending = false
        snap.forEach(d => {
          const data = d.data()
          if (data.referralDiscountApplied === true && data.status !== 'rejected' && data.status !== 'failed') {
            hasPending = true
          }
        })
        setIsReferralPending(hasPending)
      })
      return () => unsub()
    }
  }, [user?.uid])

  const handleCopyCode = () => {
    if (!user?.referralCode) return
    navigator.clipboard.writeText(user.referralCode)
    toast.success('Code copied')
  }

  const handleCopyLink = () => {
    if (!user?.referralCode) return
    const link = `${window.location.origin}/?ref=${user.referralCode}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied')
  }

  const isClaimed = (user && (user as any).referralDiscountUsed) || isReferralPending
  const referralDiscount = isClaimed ? 0 : Math.min((stats?.totalReferrals || 0) * 5, 100)

  return (
    <div className="profile-section-card" style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(20, 20, 20, 0.8))', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
      <div className="profile-section-header">
        <h3 className="profile-section-title">
          <span className="profile-section-icon" style={{ color: '#34d399' }}>🎁</span> Refer & Earn
        </h3>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 14, color: '#ccc', marginBottom: 16 }}>
          Invite friends: you both get <b style={{ color: '#34d399' }}>free Premium days</b> when they join, plus <b style={{ color: '#34d399' }}>5% off</b> Premium for each friend who matches.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
          <div>
            <span style={{ fontSize: 13, color: '#aaa', display: 'block' }}>Your Referral Code</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1, color: 'white' }}>{user?.referralCode || '---'}</span>
              <button onClick={handleCopyCode} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} title="Copy Code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button onClick={handleCopyLink} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} title="Copy Link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#aaa' }}>Total Referrals</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{stats?.totalReferrals || 0}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#aaa' }}>Discount Available</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: isClaimed ? '#facc15' : '#34d399' }}>
              {isClaimed ? 'Claimed' : `${referralDiscount}%`}
            </div>
          </div>
        </div>

        {isClaimed ? (
          <button
            disabled
            className="profile-btn"
            style={{ width: '100%', justifyContent: 'center', background: '#333', borderColor: '#444', color: '#facc15', cursor: 'not-allowed', opacity: 0.8 }}
          >
            Reward Claimed
          </button>
        ) : (
          <button
            className="profile-btn profile-btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: referralDiscount > 0 ? '#10b981' : 'linear-gradient(135deg, #ff416c, #ff4b2b)', borderColor: 'transparent', color: '#fff' }}
            onClick={async () => {
              if (referralDiscount > 0) { nav('/dashboard/plans?redeem=true'); return }
              if (!user?.referralCode) return
              const link = `${window.location.origin}/?ref=${user.referralCode}`
              const text = `Join me on DateU, the campus dating app. Use my code ${user.referralCode} when you sign up:`
              // Native share sheet on phones; copy the link elsewhere
              if (navigator.share) {
                try { await navigator.share({ title: 'DateU', text, url: link }) } catch { }
              } else {
                await navigator.clipboard.writeText(`${text} ${link}`).then(() => toast.success('Invite link copied')).catch(() => { })
              }
            }}
          >
            {referralDiscount > 0 ? 'Redeem on Plans Page' : 'Share my code'}
          </button>
        )}
      </div>
    </div>
  )
}

