import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../state/AuthContext'
import { useCall } from '../../state/CallContext'
import { reportUser } from '../../services/chatModeration'
import ReportModal from '../chat/ReportModal'
import './CallScreen.css'

function clock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function ageFromDob(dob?: string) {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

const I = {
  mic: (off?: boolean) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  ),
  phone: (size = 30, rotate = 0) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
    </svg>
  ),
  chat: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
  ),
  down: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
  ),
  flag: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
  ),
  heart: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
  ),
  x: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
}

const SEARCH_TIPS = [
  'Say hi and ask what they’re up to today',
  'Calls are voice only — no photos until you both like',
  'If you both tap Like, a chat opens for you two',
  'Be kind. Anyone who breaks the rules can be reported',
]

/** Full-screen call UI (like a phone's call screen), or a floating bubble while you use the app. */
export default function CallScreen() {
  const { user } = useAuth()
  const c = useCall()
  const nav = useNavigate()
  const [showReport, setShowReport] = useState(false)
  const [tip, setTip] = useState(0)

  const open = c.phase !== 'idle' && !(c.minimized && c.phase !== 'incoming' && c.phase !== 'ended')

  // No page scrolling behind the call screen
  useEffect(() => {
    document.documentElement.classList.toggle('call-open', open)
    return () => document.documentElement.classList.remove('call-open')
  }, [open])

  useEffect(() => {
    if (c.phase !== 'searching') return
    const i = setInterval(() => setTip((t) => (t + 1) % SEARCH_TIPS.length), 3500)
    return () => clearInterval(i)
  }, [c.phase])

  // A finished call with a match closes itself after a moment, like a phone
  const autoClose = c.phase === 'ended' && c.isMatchCall && c.wasConnected
  useEffect(() => {
    if (!autoClose) return
    const t = setTimeout(() => c.dismiss(), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClose])

  if (!user || c.phase === 'idle') return null

  const peer = c.peer
  const first = peer?.name?.split(' ')[0] || (c.isMatchCall ? 'Your match' : 'Someone new')
  const age = ageFromDob(peer?.dob)
  const random = !c.isMatchCall
  // Random calls stay anonymous-ish until they connect: no photo while searching
  const showPeer = !!peer && c.phase !== 'searching'
  const myDecision = c.callId ? c.call?.decisions?.[user.uid] : undefined
  const peerDecision = peer ? c.call?.decisions?.[peer.uid] : undefined
  const chatHours = c.call?.chatWindowHours ?? 24
  const warn = random && c.phase === 'in-call' && c.remainingSec <= 30

  const openChat = () => {
    if (!peer) return
    c.minimize()
    nav(`/dashboard/chat?with=${encodeURIComponent(peer.uid)}`)
  }
  const closeAnd = (fn: () => void) => { c.dismiss(); fn() }

  let status = ''
  if (c.phase === 'incoming') status = 'Incoming voice call'
  else if (c.phase === 'searching') status = 'Finding someone to talk to…'
  else if (c.phase === 'connecting') {
    if (c.isMatchCall && c.outgoing) status = !c.call ? 'Calling…' : c.call.status === 'ringing' ? 'Ringing…' : 'Connecting…'
    else status = 'Connecting…'
  } else if (c.phase === 'in-call') status = c.reconnecting ? 'Reconnecting…' : random ? `${clock(c.remainingSec)} left` : clock(c.elapsedSec)
  else if (c.phase === 'ended') status = c.wasConnected ? `Call ended · ${clock(c.elapsedSec)}` : 'Call ended'

  /* ------------ Minimised bubble ------------ */
  if (!open) {
    return (
      <motion.button
        type="button"
        className={`cs-bubble ${c.phase === 'in-call' ? 'live' : ''}`}
        onClick={c.expand}
        aria-label="Return to call"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileTap={{ scale: 0.95 }}
      >
        <span className="cs-bubble-avatar">
          {showPeer && peer?.photoUrl ? <img src={peer.photoUrl} alt="" /> : I.phone(20)}
        </span>
        <span className="cs-bubble-label">
          {c.phase === 'in-call' ? (random ? clock(c.remainingSec) : clock(c.elapsedSec)) : c.phase === 'searching' ? 'Searching' : 'Calling'}
        </span>
      </motion.button>
    )
  }

  /* ------------ Full screen ------------ */
  const avatar = (
    <div className={`cs-avatar-wrap ${c.phase === 'incoming' || c.phase === 'searching' || (c.phase === 'connecting') ? 'pulsing' : ''} ${c.phase === 'in-call' ? 'live' : ''}`}>
      <span /><span />
      <div className="cs-avatar">
        {showPeer && peer?.photoUrl
          ? <img src={peer.photoUrl} alt={first} />
          : showPeer ? <span className="cs-avatar-initial">{first.charAt(0).toUpperCase()}</span> : I.phone(44)}
      </div>
    </div>
  )

  let actions: JSX.Element
  if (c.phase === 'incoming') {
    actions = (
      <div className="cs-actions two">
        <div className="cs-action">
          <button type="button" className="cs-round end" onClick={c.decline} aria-label="Decline">{I.phone(30, 135)}</button>
          <span>Decline</span>
        </div>
        <div className="cs-action">
          <button type="button" className="cs-round accept" onClick={c.answer} aria-label="Answer">{I.phone(30)}</button>
          <span>Answer</span>
        </div>
      </div>
    )
  } else if (c.phase === 'searching' || c.phase === 'connecting' || c.phase === 'in-call') {
    actions = (
      <div className="cs-actions">
        <div className="cs-action">
          <button type="button" className={`cs-round ${c.muted ? 'on' : ''}`} onClick={c.toggleMute} disabled={c.phase !== 'in-call'} aria-label={c.muted ? 'Unmute' : 'Mute'} aria-pressed={c.muted}>
            {I.mic(c.muted)}
          </button>
          <span>{c.muted ? 'Unmute' : 'Mute'}</span>
        </div>
        <div className="cs-action">
          <button type="button" className="cs-round end big" onClick={c.hangUp} aria-label={c.phase === 'searching' ? 'Cancel' : 'End call'}>{I.phone(34, 135)}</button>
          <span>{c.phase === 'searching' ? 'Cancel' : 'End'}</span>
        </div>
        {c.isMatchCall ? (
          <div className="cs-action">
            <button type="button" className="cs-round" onClick={openChat} disabled={!peer} aria-label="Open chat">{I.chat()}</button>
            <span>Chat</span>
          </div>
        ) : (
          <div className="cs-action">
            <button type="button" className="cs-round" onClick={c.minimize} aria-label="Minimise call">{I.down()}</button>
            <span>Minimise</span>
          </div>
        )}
      </div>
    )
  } else if (c.isMatchCall) {
    // Ended call with a match / friend
    actions = (
      <div className="cs-actions">
        <div className="cs-action">
          <button type="button" className="cs-round" onClick={() => closeAnd(() => peer && nav(`/dashboard/chat?with=${encodeURIComponent(peer.uid)}`))} disabled={!peer} aria-label="Message">{I.chat()}</button>
          <span>Message</span>
        </div>
        {!c.wasConnected && peer && (
          <div className="cs-action">
            <button type="button" className="cs-round accept big" onClick={() => c.callPerson(peer.uid, peer)} aria-label="Call again">{I.phone(32)}</button>
            <span>Call again</span>
          </div>
        )}
        <div className="cs-action">
          <button type="button" className="cs-round" onClick={c.dismiss} aria-label="Close">{I.x()}</button>
          <span>Close</span>
        </div>
      </div>
    )
  } else {
    // Ended random call: like / pass
    let outcome: JSX.Element | null = null
    if (!c.wasConnected) {
      outcome = null
    } else if (c.call?.connected) {
      outcome = (
        <div className="cs-outcome">
          <h3>It’s a connection! 💞</h3>
          <p>You and {first} liked each other. You have {chatHours} hours of free chat — Premium keeps it going after that.</p>
          <button type="button" className="cs-pill primary" onClick={() => closeAnd(() => nav(`/dashboard/chat?with=${encodeURIComponent(peer!.uid)}`))}>Let’s chat</button>
        </div>
      )
    } else if (!myDecision) {
      outcome = (
        <div className="cs-outcome">
          <h3>Want to keep talking to {first}?</h3>
          <p>If you both tap Like, we’ll open a chat for you two.</p>
          <div className="cs-decide">
            <div className="cs-action">
              <button type="button" className="cs-round pass" onClick={() => c.decide('pass')} aria-label="Pass">{I.x()}</button>
              <span>Pass</span>
            </div>
            <div className="cs-action">
              <button type="button" className="cs-round like" onClick={() => c.decide('like')} aria-label="Like">{I.heart()}</button>
              <span>Like</span>
            </div>
          </div>
        </div>
      )
    } else if (myDecision === 'like' && !peerDecision) {
      outcome = (
        <div className="cs-outcome">
          <h3>You liked {first} 💖</h3>
          <p>Waiting for {first}. We’ll let you know if it’s mutual.</p>
        </div>
      )
    } else {
      outcome = <div className="cs-outcome"><h3>No connection this time</h3><p>Plenty more people to meet.</p></div>
    }
    actions = (
      <>
        {outcome}
        <div className="cs-footer">
          <button type="button" className="cs-pill" onClick={c.dismiss}>Done</button>
          <button type="button" className="cs-pill primary" onClick={() => c.startRandom()}>Next call</button>
        </div>
      </>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key="call"
        className={`cs-screen phase-${c.phase}`}
        role="dialog"
        aria-modal="true"
        aria-label={c.phase === 'incoming' ? `${first} is calling` : 'Voice call'}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {showPeer && peer?.photoUrl && <div className="cs-bg" style={{ backgroundImage: `url(${JSON.stringify(peer.photoUrl)})` }} aria-hidden="true" />}

        <div className="cs-top">
          {c.phase !== 'incoming' && c.phase !== 'ended' ? (
            <button type="button" className="cs-icon-btn" onClick={c.minimize} aria-label="Minimise call">{I.down()}</button>
          ) : <span className="cs-icon-btn placeholder" />}
          <span className="cs-brand">{random ? 'DateU random call' : 'DateU voice call'}</span>
          {random && peer && (c.wasConnected || c.phase === 'in-call') ? (
            <button type="button" className="cs-icon-btn" onClick={() => setShowReport(true)} aria-label="Report">{I.flag()}</button>
          ) : <span className="cs-icon-btn placeholder" />}
        </div>

        <div className="cs-middle">
          {avatar}
          <h2 className="cs-name">
            {c.phase === 'searching' ? 'Random call' : `${first}${age && showPeer ? `, ${age}` : ''}`}
          </h2>
          {showPeer && peer?.college && c.phase !== 'searching' && <div className="cs-sub">{peer.college}</div>}
          <div className={`cs-status ${warn ? 'warn' : ''} ${c.phase === 'in-call' ? 'live' : ''}`} aria-live="polite">{status}</div>
          {random && c.phase === 'in-call' && (
            <div className="cs-progress" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, (c.remainingSec / (c.call?.maxDurationSec || 300)) * 100))}%` }} />
            </div>
          )}
          {c.phase === 'searching' && (
            <AnimatePresence mode="wait">
              <motion.p key={tip} className="cs-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {SEARCH_TIPS[tip]}
              </motion.p>
            </AnimatePresence>
          )}
          {c.phase === 'in-call' && c.muted && <div className="cs-chip">You’re muted</div>}
          {c.notice && c.phase === 'ended' && <p className="cs-notice">{c.notice}</p>}
        </div>

        <div className="cs-bottom">{actions}</div>

        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          onSubmit={async (reason) => {
            if (!peer || !c.callId) return
            await reportUser({ reporterUid: user.uid, reportedUid: peer.uid, threadId: `randomCall_${c.callId}`, reason })
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
