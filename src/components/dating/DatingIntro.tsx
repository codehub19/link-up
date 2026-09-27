import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../Navbar'
import { useAuth } from '../../state/AuthContext'
import { hasDatingDetails, updateProfileAndStatus } from '../../firebase'
import './DatingIntro.css'

const STEPS = [
  { icon: '📝', title: 'Add your dating details', text: 'Who you’re into, what you’re looking for and a few fun questions. About 2 minutes.' },
  { icon: '🗓️', title: 'Join a matching round', text: 'Each round, pick the people you like from a hand-picked set of profiles.' },
  { icon: '💞', title: 'Match when it’s mutual', text: 'Only mutual likes become matches — then chat and call right here.' },
]

/** Shown in the Dating tab until someone sets up dating. */
export default function DatingIntro() {
  const nav = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  // Set up before, then paused in Settings
  const paused = profile?.datingEnabled === false && (!!profile?.datingProfileComplete || hasDatingDetails(profile))

  const resume = async () => {
    if (!user) return
    setBusy(true)
    try {
      await updateProfileAndStatus(user.uid, { datingEnabled: true })
      await refreshProfile()
      toast.success('Dating is back on 💘')
    } catch {
      toast.error('Could not turn dating on. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (paused) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container">
          <div className="di-wrap">
            <div className="di-hero" aria-hidden="true"><span className="di-heart">⏸️</span></div>
            <h1 className="di-title">Dating is paused</h1>
            <p className="di-sub">You’re hidden from matching rounds. Your matches and chats are still here.</p>
            <button type="button" className="di-btn" onClick={resume} disabled={busy}>
              {busy ? 'Turning on…' : 'Turn dating back on'}
            </button>
            <button type="button" className="di-link" onClick={() => nav('/dashboard/matches')}>My matches</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="di-wrap">
          <div className="di-hero" aria-hidden="true">
            <span className="di-heart">💘</span>
          </div>
          <h1 className="di-title">Ready to try dating?</h1>
          <p className="di-sub">
            Dating on DateU is optional. Turn it on whenever you like — your friends and events stay exactly as they are.
          </p>
          <ol className="di-steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <span className="di-step-icon">{s.icon}</span>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="di-btn" onClick={() => nav('/dashboard/dating-profile')}>
            Set up dating
          </button>
          <button type="button" className="di-link" onClick={() => nav('/dashboard/friends')}>
            Not now — find friends instead
          </button>
          <p className="di-note">Only people who have turned on dating can see you in rounds.</p>
        </div>
      </div>
    </>
  )
}
