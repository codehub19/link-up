import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../state/AuthContext'
import { assignReferralCode } from '../services/referrals'
import { track } from '../utils/analytics'
import './InviteCard.css'

/**
 * "Bring your friends" — the referral loop, shown where people feel the network:
 * an empty or short Discover list, and right after making friends.
 */
export default function InviteCard({ title, text, where }: { title?: string; text?: string; where: string }) {
  const { user, profile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const share = async () => {
    setBusy(true)
    try {
      let code = (profile as any)?.referralCode as string | undefined
      if (!code) {
        code = await assignReferralCode(user.uid, profile?.name || 'User')
        refreshProfile().catch(() => { })
      }
      const link = `${window.location.origin}/${code ? `?ref=${code}` : ''}`
      const msg = `I’m on DateU — it’s for meeting new people from every college: find people for fests and events, join groups and make new friends. Join me 👋${code ? ` (code ${code})` : ''}`
      track('referral_shared', { where })
      if (navigator.share) {
        try { await navigator.share({ title: 'DateU', text: msg, url: link }) } catch { /* cancelled */ }
      } else {
        await navigator.clipboard.writeText(`${msg} ${link}`)
        toast.success('Invite link copied')
      }
    } catch {
      toast.error('Couldn’t create your invite link. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="invite-card">
      <div className="invite-art" aria-hidden="true">🎟️</div>
      <div className="invite-body">
        <strong>{title || 'Bring your friends'}</strong>
        <p>{text || 'DateU is more fun with your people. Invite them — you both get free Premium days when they finish signing up.'}</p>
      </div>
      <button type="button" className="invite-btn" onClick={share} disabled={busy}>{busy ? '…' : 'Invite'}</button>
    </div>
  )
}
