import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from './ChatList'
import '../../styles/chat.css'

const VerifiedBadge = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-label="Verified student">
    <circle cx="11" cy="11" r="10" fill="#3b82f6" />
    <path d="M7.7 11.8l2.1 2.1 4.1-4.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Quick look at the person you're chatting with. */
export default function ProfileModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user?: { uid?: string; name?: string; instagramId?: string; photoUrl?: string; bio?: string; interests?: string[]; college?: string; collegeId?: { verified?: boolean } }
}) {
  const nav = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !user) return null

  return (
    <div className="dm dm-modal" role="dialog" aria-modal="true" aria-label={user.name || 'Profile'} onClick={onClose}>
      <div className="dm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dm-sheet-handle" />
        <button type="button" className="dm-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="dm-modal-head">
          <Avatar name={user.name} photoUrl={user.photoUrl} />
          <div className="dm-modal-name">
            {user.name || 'User'}
            {user.collegeId?.verified && <VerifiedBadge />}
          </div>
          {user.college && <div className="dm-modal-sub">{user.college}</div>}
          {user.instagramId && <div className="dm-modal-sub">@{user.instagramId}</div>}
        </div>
        {user.bio && <p className="dm-modal-bio">{user.bio}</p>}
        {!!user.interests?.length && (
          <div className="dm-modal-tags">
            {user.interests.map((i) => <span key={i}>{i}</span>)}
          </div>
        )}
        {user.uid && (
          <div className="dm-modal-actions">
            <button type="button" className="dm-pill-btn" onClick={() => { onClose(); nav(`/profile/${user.uid}`) }}>
              View full profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
