import React from 'react'
import { useAuth } from '../../../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProfileTab from '../ProfileTab'
import '../dashboard.css'
import '../male/Profile.styles.css' // Reusing the Male styles
import { getReferralStats, createReferralClaim, listPendingClaims, assignReferralCode } from '../../../services/referrals'
import { toast } from 'sonner'
import { db, updatePrivateProfile, getPrivateProfile } from '../../../firebase'

export default function ProfilePage() {
  const { profile } = useAuth()
  return <ProfileTab referral={<ReferralCard user={profile} />} />
}

function ReferralCard({ user }: { user: any }) {
  const [stats, setStats] = React.useState<any>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const nav = useNavigate()

  // Local state for immediate feedback
  const [upiId, setUpiId] = React.useState(user?.upiId || '')
  const [isActivated, setIsActivated] = React.useState(!!user?.upiId)
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const { refreshProfile } = useAuth()

  const refreshData = () => {
    if (user?.uid) {
      getReferralStats(user.uid).then(setStats)
      import('../../../services/referrals').then(({ getMyClaims }) => {
        getMyClaims(user.uid).then(claims => {
          claims.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setHistory(claims)
        })
      })

      if (!user.referralCode) {
        assignReferralCode(user.uid, user.name || 'User')
          .then(() => refreshProfile())
          .catch(console.error)
      }
    }
  }

  React.useEffect(() => {
    refreshData()
  }, [user?.uid])

  // The UPI ID is stored in the private profile
  React.useEffect(() => {
    if (!user?.uid) return
    getPrivateProfile(user.uid).then((priv) => {
      if (priv.upiId) {
        setUpiId(priv.upiId)
        setIsActivated(true)
      }
    }).catch(() => { })
  }, [user?.uid])

  const handleActivate = async () => {
    if (!upiId.trim() || !user?.uid) return
    setLoading(true)
    try {
      await updatePrivateProfile(user.uid, { upiId: upiId.trim() })
      setIsActivated(true)
      toast.success('Referral program activated!')
      refreshData()
    } catch (e) {
      toast.error('Failed to save details')
    } finally {
      setLoading(false)
    }
  }

  // Calculate Financials
  const qualified = stats?.qualifiedReferrals || 0
  const paid = user?.referralEarningsPaid || 0
  const totalEarned = Math.min(qualified * 5, 50)

  // Calculate pending assertions
  const pendingAmount = history
    .filter(h => h.status === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0)

  // Available is strictly what is NOT paid AND NOT pending
  const available = Math.max(0, totalEarned - paid - pendingAmount)

  // Max Limit Reached?
  // If totalEarned is 50, and we have claimed everything (available is 0).
  const isMaxedOut = totalEarned >= 50 && available <= 0

  const handleClaim = async () => {
    if (!stats || !user?.uid) return
    if (available <= 0) return

    setSubmitting(true)
    try {
      await createReferralClaim(user.uid, available, upiId)
      toast.success('Claim submitted! Admin will verify.')
      refreshData()
    } catch (e) {
      toast.error('Claim failed')
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div className="profile-section-card" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(20, 20, 20, 0.8))', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
      <div className="profile-section-header">
        <h3 className="profile-section-title">
          <span className="profile-section-icon" style={{ color: '#f472b6' }}>🎁</span> Refer & Earn
        </h3>
      </div>

      {!isActivated ? (
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 14, color: '#ddd', marginBottom: 16 }}>
            Invite friends: you both get <b style={{ color: '#f472b6' }}>free Premium days</b> when they join, and you earn <b style={{ color: '#f472b6' }}>₹5</b> for every friend who matches (max ₹50).
            <br />Enter your UPI ID to start.
          </p>
          <input
            className="field-input"
            placeholder="Enter UPI ID (e.g. user@okhdfc)"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <button
            className="profile-btn profile-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleActivate}
            disabled={loading}
          >
            {loading ? 'Activating...' : 'Start Earning'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 20px 20px' }}>

          {isMaxedOut ? (
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
              <h4 style={{ margin: '0 0 4px 0', color: '#f472b6' }}>Program Completed!</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
                You have earned the maximum limit of ₹50. Thank you for referring!
              </p>
            </div>
          ) : (
            <>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Signups</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>{stats?.totalReferrals || 0}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Matched</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>{qualified}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Available</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#4ade80' }}>₹{available}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 16, padding: '0 4px' }}>
                <span>Total Limit: ₹50</span>
                <span>Claimed: ₹{paid + pendingAmount}</span>
              </div>

              <button
                className="profile-btn profile-btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: available > 0 ? '#10b981' : '#333', borderColor: available > 0 ? '#059669' : '#444', cursor: available > 0 ? 'pointer' : 'not-allowed' }}
                onClick={handleClaim}
                disabled={submitting || available <= 0}
              >
                {submitting ? 'Claiming...' : available > 0 ? `Claim ₹${available}` : 'No earnings to claim'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}


