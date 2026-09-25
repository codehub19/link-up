import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import MaleTabs from '../../components/MaleTabs'
import FemaleTabs from '../../components/FemaleTabs'
import PhoneVerification from '../../components/PhoneVerification'
import ReportModal from '../../components/chat/ReportModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../state/AuthContext'
import { db, updateProfileAndStatus } from '../../firebase'
import { reportUser } from '../../services/chatModeration'
import {
  HEARTBEAT_MS,
  REJOIN_MS,
  RandomCallDoc,
  RandomCallSession,
  joinRandomCallQueue,
  leaveRandomCallQueue,
  startMatchCall,
  sendQueueHeartbeat,
  submitCallDecision,
  subscribeQueueEntry,
  subscribeRandomCall,
  subscribeRandomCallConfig,
  subscribeRandomCallStats,
} from '../../services/randomCall'
import './dashboard.css'
import './RandomCall.styles.css'

// Mirrors RANDOM_CALL_DEFAULTS in functions/src/randomCall.ts (server is authoritative).
const DEFAULTS = {
  maxCallSeconds: 300,
  dailyCallLimit: 5,
  chatWindowHours: 24,
  utcOffsetMinutes: 330,
  openHour: null as number | null,
  closeHour: null as number | null,
}
const CONNECT_TIMEOUT_MS = 30_000
// Calls to a match ring on the other person's phone first, so allow longer
const RING_TIMEOUT_MS = 45_000

function formatHour(h: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${suffix}`
}

type Phase = 'idle' | 'searching' | 'connecting' | 'in-call' | 'post-call'
type Peer = { uid: string; name?: string; photoUrl?: string; college?: string; dob?: string }

function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function ageFromDob(dob?: string) {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

export default function RandomCall() {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  // ?call=<id>: answering a match call · ?with=<uid>: calling a match
  const answerCallId = params.get('call')
  const callPeerUid = params.get('with')
  const matchMode = !!(answerCallId || callPeerUid)

  const [phase, setPhase] = useState<Phase>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [call, setCall] = useState<RandomCallDoc | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [muted, setMuted] = useState(false)
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [wasConnected, setWasConnected] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [joining, setJoining] = useState(false)
  const [needsPhone, setNeedsPhone] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [stats, setStats] = useState<{ day?: string; calls?: number; dailyLimit?: number } | null>(null)
  const [savingReminder, setSavingReminder] = useState(false)
  const [cfg, setCfg] = useState(DEFAULTS)

  const sessionRef = useRef<RandomCallSession | null>(null)
  const phaseRef = useRef<Phase>('idle')
  phaseRef.current = phase

  const uid = user?.uid
  const isMatchCall = matchMode || call?.type === 'match'
  // Phone verification is only required to call strangers
  const phoneVerified = isMatchCall || (!!profile?.isPhoneVerified && !needsPhone)
  const dailyLimit = stats?.dailyLimit ?? cfg.dailyCallLimit

  useEffect(() => {
    if (!uid) return
    const stopStats = subscribeRandomCallStats(uid, setStats)
    const stopCfg = subscribeRandomCallConfig((c) => setCfg({ ...DEFAULTS, ...(c || {}) }))
    return () => { stopStats(); stopCfg() }
  }, [uid])

  const callsLeft = useMemo(() => {
    const today = new Date(Date.now() + cfg.utcOffsetMinutes * 60_000).toISOString().slice(0, 10)
    const used = stats?.day === today ? Number(stats.calls || 0) : 0
    return Math.max(0, (stats?.dailyLimit ?? cfg.dailyCallLimit) - used)
  }, [stats, cfg])

  const hoursSet = cfg.openHour != null && cfg.closeHour != null
  const openNow = useMemo(() => {
    if (!hoursSet) return true
    const h = new Date(Date.now() + cfg.utcOffsetMinutes * 60_000).getUTCHours()
    return cfg.openHour! <= cfg.closeHour! ? h >= cfg.openHour! && h < cfg.closeHour! : h >= cfg.openHour! || h < cfg.closeHour!
  }, [cfg, hoursSet, now])

  // Answer an incoming match call, or place one
  const startedFromParams = useRef(false)
  useEffect(() => {
    if (!uid || startedFromParams.current) return
    if (answerCallId) {
      startedFromParams.current = true
      setCallId(answerCallId)
    } else if (callPeerUid) {
      startedFromParams.current = true
      setJoining(true)
      startMatchCall(callPeerUid)
        .then((res) => setCallId(res.callId))
        .catch((e) => {
          toast.error(e?.message || 'Could not start the call.')
          setParams({}, { replace: true })
        })
        .finally(() => setJoining(false))
    }
  }, [uid, answerCallId, callPeerUid, setParams])

  const toggleReminders = async () => {
    if (!uid) return
    setSavingReminder(true)
    try {
      await updateProfileAndStatus(uid, { callReminders: !profile?.callReminders })
      await refreshProfile()
      toast.success(profile?.callReminders ? 'Reminders turned off' : "We'll remind you when calls open")
    } catch {
      toast.error('Could not save your reminder setting.')
    } finally {
      setSavingReminder(false)
    }
  }

  // Tick for countdowns
  useEffect(() => {
    if (phase !== 'in-call' && phase !== 'connecting') return
    const i = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(i)
  }, [phase])

  const endSession = useCallback(async (reason?: string) => {
    const s = sessionRef.current
    sessionRef.current = null
    if (s) await s.close(reason)
    setMuted(false)
    setPhase('post-call')
  }, [])

  const resetForNextCall = useCallback(() => {
    if (params.toString()) setParams({}, { replace: true })
    setCallId(null)
    setCall(null)
    setPeer(null)
    setConnectedAt(null)
    setWasConnected(false)
    setNotice(null)
    setPhase('idle')
  }, [params, setParams])

  /* ---------------- Queue ---------------- */
  const startSearch = async () => {
    if (!uid || joining) return
    resetForNextCall()
    setJoining(true)
    try {
      const res = await joinRandomCallQueue()
      if (res.status === 'matched') setCallId(res.callId)
      else setPhase('searching')
    } catch (e: any) {
      const reason = e?.details?.reason
      if (reason === 'phone') setNeedsPhone(true)
      toast.error(e?.message || 'Could not start a call. Please try again.')
      setPhase('idle')
    } finally {
      setJoining(false)
    }
  }

  const cancelSearch = async () => {
    if (uid) await leaveRandomCallQueue(uid)
    setPhase('idle')
  }

  // While searching: heartbeat + wait for the server to pair us
  useEffect(() => {
    if (!uid || phase !== 'searching') return
    const stop = subscribeQueueEntry(uid, (entry) => {
      if (entry?.status === 'matched' && entry.callId) setCallId(entry.callId)
    })
    const hb = setInterval(() => sendQueueHeartbeat(uid).catch(() => { }), HEARTBEAT_MS)
    const rejoin = setInterval(() => {
      if (phaseRef.current !== 'searching') return
      joinRandomCallQueue({ rejoin: true })
        .then((res) => { if (res.status === 'matched' && phaseRef.current === 'searching') setCallId(res.callId) })
        .catch(() => { })
    }, REJOIN_MS)
    return () => { stop(); clearInterval(hb); clearInterval(rejoin) }
  }, [uid, phase])

  /* ---------------- Call ---------------- */
  useEffect(() => {
    if (!uid || !callId) return
    setPhase('connecting')
    leaveRandomCallQueue(uid)
    const stop = subscribeRandomCall(callId, setCall)
    return () => stop()
  }, [uid, callId])

  // Load peer + start WebRTC once the call doc arrives
  useEffect(() => {
    if (!uid || !call || sessionRef.current || phaseRef.current !== 'connecting') return
    const peerUid = call.participants.find((p) => p !== uid)
    if (!peerUid) return
    if (call.status === 'ended') {
      // e.g. answering a call the caller already hung up
      setNotice('This call has ended.')
      setPhase('post-call')
      return
    }

    getDoc(doc(db, 'users', peerUid)).then((snap) => {
      if (snap.exists()) setPeer({ uid: peerUid, ...(snap.data() as any) })
    }).catch(() => { })

    const session = new RandomCallSession(call.id, uid, peerUid, call.callerUid === uid, (s) => {
      if (s === 'connected') {
        setConnectedAt((prev) => prev ?? Date.now())
        setWasConnected(true)
        setPhase('in-call')
      } else if (s === 'failed' && sessionRef.current === session) {
        setNotice("The connection dropped. Let's try someone else.")
        endSession('failed')
      }
    })
    sessionRef.current = session
    session.start().catch((e) => {
      console.error(e)
      setNotice(e?.name === 'NotAllowedError'
        ? 'Microphone access is needed for voice calls. Allow it in your browser settings and try again.'
        : 'Could not start the call.')
      endSession('mic_error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, call?.id])

  // Peer hung up
  useEffect(() => {
    if (call?.status === 'ended' && sessionRef.current) {
      if (!wasConnected) setNotice(`${peer?.name?.split(' ')[0] || 'They'} couldn't connect.`)
      endSession()
    }
  }, [call?.status, wasConnected, peer, endSession])

  // Connect timeout
  useEffect(() => {
    if (phase !== 'connecting') return
    const t = setTimeout(() => {
      if (phaseRef.current === 'connecting') {
        setNotice(isMatchCall ? 'No answer. Try again later.' : "Couldn't connect this time. Try another call.")
        endSession('no_answer')
      }
    }, isMatchCall ? RING_TIMEOUT_MS : CONNECT_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [phase, endSession, isMatchCall])

  // Hard time limit
  const maxSec = call?.maxDurationSec ?? cfg.maxCallSeconds
  const remainingSec = connectedAt ? maxSec - (now - connectedAt) / 1000 : maxSec
  useEffect(() => {
    if (phase === 'in-call' && remainingSec <= 0) {
      setNotice("Time's up!")
      endSession('time_limit')
    }
  }, [phase, remainingSec, endSession])

  // Leaving the page ends the call / leaves the queue
  useEffect(() => {
    return () => {
      sessionRef.current?.close('left')
      sessionRef.current = null
      if (uid && phaseRef.current === 'searching') leaveRandomCallQueue(uid)
    }
  }, [uid])

  const toggleMute = () => {
    const next = !muted
    sessionRef.current?.setMuted(next)
    setMuted(next)
  }

  const decide = async (d: 'like' | 'pass') => {
    if (!uid || !callId) return
    try {
      await submitCallDecision(callId, uid, d)
    } catch {
      toast.error('Could not save your choice. Please try again.')
    }
  }

  if (!user) return null
  const isFemale = profile?.gender === 'female'
  const peerFirst = peer?.name?.split(' ')[0] || 'your match'
  const peerAge = ageFromDob(peer?.dob)
  const myDecision = uid ? call?.decisions?.[uid] : undefined
  const peerDecision = peer ? call?.decisions?.[peer.uid] : undefined
  const chatHours = call?.chatWindowHours ?? cfg.chatWindowHours

  const peerCard = peer && (
    <div className="rc-peer">
      {peer.photoUrl
        ? <img className="rc-avatar" src={peer.photoUrl} alt={peerFirst} />
        : <div className="rc-avatar rc-avatar-fallback">{peerFirst.slice(0, 1)}</div>}
      <div className="rc-peer-name">{peerFirst}{peerAge ? `, ${peerAge}` : ''}</div>
      {peer.college && <div className="rc-muted">{peer.college}</div>}
    </div>
  )

  let body: React.ReactNode
  if (!phoneVerified) {
    body = (
      <div className="rc-card">
        <div className="rc-emoji">📞</div>
        <h2>Verify your phone to start calling</h2>
        <p className="rc-muted">
          Random calls connect you live with real people, so we ask everyone to verify a phone number first.
          It keeps calls safe and spam-free.
        </p>
        <PhoneVerification onVerified={() => setNeedsPhone(false)} />
      </div>
    )
  } else if (phase === 'idle' && profile?.banned) {
    body = (
      <div className="rc-card">
        <div className="rc-emoji">🚫</div>
        <h2>Calls unavailable</h2>
        <p className="rc-muted">Your account has been restricted from calls. Contact support if you think this is a mistake.</p>
      </div>
    )
  } else if (phase === 'idle' && matchMode) {
    body = (
      <div className="rc-card">
        <div className="rc-pulse"><span>📞</span></div>
        <h2>Starting call…</h2>
      </div>
    )
  } else if (phase === 'idle') {
    body = (
      <div className="rc-card">
        <div className="rc-emoji">🎧</div>
        <h2>Random Voice Call</h2>
        <p className="rc-muted">
          Talk to someone new for up to {Math.round(maxSec / 60)} minutes. If you both like each other,
          you get {chatHours} hours of free chat.
        </p>
        {hoursSet && (
          <p className={openNow ? 'rc-muted rc-small' : 'rc-notice'}>
            Call hours: {formatHour(cfg.openHour!)} – {formatHour(cfg.closeHour!)}{openNow ? ' · open now' : ' · closed right now'}
          </p>
        )}
        <button className="rc-btn rc-btn-primary" onClick={startSearch} disabled={joining || callsLeft === 0 || !openNow}>
          {joining ? <LoadingSpinner size={18} color="#fff" /> : 'Start a call'}
        </button>
        <p className="rc-muted rc-small">
          {callsLeft === 0 ? "You've used all your calls today. Come back tomorrow!" : `${callsLeft} of ${dailyLimit} calls left today`}
        </p>
        {callsLeft === 0 && dailyLimit <= cfg.dailyCallLimit && (
          <button className="rc-btn rc-btn-link" onClick={() => nav(profile?.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium')}>
            Get more calls with Premium
          </button>
        )}
        {hoursSet && (
          <button className="rc-btn rc-btn-link" onClick={toggleReminders} disabled={savingReminder}>
            {profile?.callReminders ? '🔕 Stop call-hour reminders' : '🔔 Remind me when calls open'}
          </button>
        )}
      </div>
    )
  } else if (phase === 'searching') {
    body = (
      <div className="rc-card">
        <div className="rc-pulse"><span>🔎</span></div>
        <h2>Finding someone to talk to…</h2>
        <p className="rc-muted">Keep this page open. We'll connect you as soon as someone is available.</p>
        <button className="rc-btn rc-btn-ghost" onClick={cancelSearch}>Cancel</button>
      </div>
    )
  } else if (phase === 'connecting' || phase === 'in-call') {
    body = (
      <div className="rc-card">
        {peerCard || <div className="rc-pulse"><span>📞</span></div>}
        <div className={`rc-timer ${phase === 'in-call' && remainingSec <= 30 ? 'rc-timer-warn' : ''}`}>
          {phase === 'connecting'
            ? (call?.status === 'ringing' && call.callerUid === uid ? 'Ringing…' : 'Connecting…')
            : formatClock(remainingSec)}
        </div>
        {phase === 'in-call' && <p className="rc-muted rc-small">Call ends automatically when the timer runs out</p>}
        <div className="rc-controls">
          <button className={`rc-round ${muted ? 'rc-round-on' : ''}`} onClick={toggleMute} disabled={phase !== 'in-call'} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🎙️'}
          </button>
          <button className="rc-round rc-round-end" onClick={() => endSession('hangup')} aria-label="End call">
            ✕
          </button>
        </div>
      </div>
    )
  } else {
    // post-call
    let outcome: React.ReactNode
    if (!wasConnected) {
      outcome = null
    } else if (isMatchCall) {
      outcome = <h2>Call ended</h2>
    } else if (call?.connected) {
      outcome = (
        <>
          <h2>It's a connection! 💞</h2>
          <p className="rc-muted">
            You and {peerFirst} liked each other. You have {chatHours} hours of free chat — after that, Premium keeps the conversation going.
          </p>
          <button className="rc-btn rc-btn-primary" onClick={() => nav(`/dashboard/chat?with=${encodeURIComponent(peer!.uid)}`)}>
            Let's chat
          </button>
        </>
      )
    } else if (!myDecision) {
      outcome = (
        <>
          <h2>How was your call with {peerFirst}?</h2>
          <p className="rc-muted">If you both tap Like, we'll open a chat for you two.</p>
          <div className="rc-choice">
            <button className="rc-btn rc-btn-ghost" onClick={() => decide('pass')}>Pass</button>
            <button className="rc-btn rc-btn-primary" onClick={() => decide('like')}>💖 Like</button>
          </div>
        </>
      )
    } else if (myDecision === 'like' && !peerDecision) {
      outcome = (
        <>
          <h2>You liked {peerFirst} 💖</h2>
          <p className="rc-muted">Waiting for {peerFirst} to decide. We'll notify you if it's mutual.</p>
        </>
      )
    } else {
      outcome = <h2>No connection this time</h2>
    }

    body = (
      <div className="rc-card">
        {peerCard}
        {notice && <p className="rc-notice">{notice}</p>}
        {outcome}
        <div className="rc-choice">
          {isMatchCall && peer ? (
            <button className="rc-btn rc-btn-primary" onClick={() => nav(`/dashboard/chat?with=${encodeURIComponent(peer.uid)}`)}>
              Back to chat
            </button>
          ) : (
            <button className="rc-btn rc-btn-ghost" onClick={resetForNextCall}>
              {callsLeft > 0 ? 'Next call' : 'Done'}
            </button>
          )}
          {peer && wasConnected && (
            <button className="rc-btn rc-btn-link" onClick={() => setShowReport(true)}>Report</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}
        <div className="rc-wrap">{body}</div>
      </div>
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={async (reason) => {
          if (!peer || !callId) return
          await reportUser({ reporterUid: user.uid, reportedUid: peer.uid, threadId: `randomCall_${callId}`, reason })
        }}
      />
    </>
  )
}
