import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import PhoneVerification from '../../components/PhoneVerification'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../state/AuthContext'
import { useCall } from '../../state/CallContext'
import { updateProfileAndStatus } from '../../firebase'
import { subscribeRandomCallConfig, subscribeRandomCallStats } from '../../services/randomCall'
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

function formatHour(h: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${suffix}`
}

const PhoneGlyph = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)

/**
 * Random-call lobby (opened from Chat). The call itself runs on the app-wide
 * call screen, so this page never starts or answers a call on its own.
 */
export default function RandomCall() {
  const { user, profile, refreshProfile } = useAuth()
  const call = useCall()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [stats, setStats] = useState<{ day?: string; calls?: number; dailyLimit?: number } | null>(null)
  const [cfg, setCfg] = useState(DEFAULTS)
  const [savingReminder, setSavingReminder] = useState(false)
  const [, setTick] = useState(0)
  const uid = user?.uid

  // Old links (?call= from a push notification, ?with=) used to dial from the URL.
  // Incoming calls now ring on the call screen by themselves, so just drop the params
  // (replace, so Back never lands on them again).
  useEffect(() => {
    if (params.has('call') || params.has('with')) setParams({}, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    if (!uid) return
    const stopStats = subscribeRandomCallStats(uid, setStats)
    const stopCfg = subscribeRandomCallConfig((c) => setCfg({ ...DEFAULTS, ...(c || {}) }))
    // Re-check call hours every minute
    const i = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => { stopStats(); stopCfg(); clearInterval(i) }
  }, [uid])

  const dailyLimit = stats?.dailyLimit ?? cfg.dailyCallLimit
  const callsLeft = useMemo(() => {
    const today = new Date(Date.now() + cfg.utcOffsetMinutes * 60_000).toISOString().slice(0, 10)
    const used = stats?.day === today ? Number(stats.calls || 0) : 0
    return Math.max(0, dailyLimit - used)
  }, [stats, cfg, dailyLimit])

  const hoursSet = cfg.openHour != null && cfg.closeHour != null
  const h = new Date(Date.now() + cfg.utcOffsetMinutes * 60_000).getUTCHours()
  const openNow = !hoursSet || (cfg.openHour! <= cfg.closeHour!
    ? h >= cfg.openHour! && h < cfg.closeHour!
    : h >= cfg.openHour! || h < cfg.closeHour!)

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

  if (!user) return null
  const phoneVerified = !!profile?.isPhoneVerified && !call.needsPhone
  const busy = call.phase !== 'idle' && call.phase !== 'ended'
  const mins = Math.round(cfg.maxCallSeconds / 60)

  let body: JSX.Element
  if (!phoneVerified) {
    body = (
      <div className="rc-card">
        <div className="rc-emoji">📞</div>
        <h2>Verify your phone to start calling</h2>
        <p className="rc-muted">
          Random calls connect you live with real people, so we ask everyone to verify a phone number first.
          It keeps calls safe and spam-free.
        </p>
        <PhoneVerification onVerified={() => call.setNeedsPhone(false)} />
      </div>
    )
  } else if (profile?.banned) {
    body = (
      <div className="rc-card">
        <div className="rc-emoji">🚫</div>
        <h2>Calls unavailable</h2>
        <p className="rc-muted">Your account has been restricted from calls. Contact support if you think this is a mistake.</p>
      </div>
    )
  } else {
    body = (
      <div className="rc-card rc-home">
        <div className="rc-hero-icon"><span /><span /><PhoneGlyph size={38} /></div>
        <h2>Talk to someone new</h2>
        <p className="rc-muted">A quick voice call with a random DateU member. No photos, no pressure — just a conversation.</p>
        <div className="rc-facts">
          <div><strong>{mins} min</strong><span>per call</span></div>
          <div><strong>Voice</strong><span>only</span></div>
          <div><strong>{cfg.chatWindowHours}h</strong><span>chat if you both like</span></div>
        </div>
        {hoursSet && (
          <p className={openNow ? 'rc-muted rc-small' : 'rc-notice'}>
            Call hours: {formatHour(cfg.openHour!)} – {formatHour(cfg.closeHour!)}{openNow ? ' · open now' : ' · closed right now'}
          </p>
        )}
        {busy ? (
          <button className="rc-btn rc-btn-primary rc-btn-block" onClick={call.expand}>
            <PhoneGlyph size={18} /> Return to your call
          </button>
        ) : (
          <button className="rc-btn rc-btn-primary rc-btn-block" onClick={() => call.startRandom()} disabled={call.joining || callsLeft === 0 || !openNow}>
            {call.joining ? <LoadingSpinner size={18} color="#fff" /> : <><PhoneGlyph size={18} /> Start a call</>}
          </button>
        )}
        <div className="rc-quota" aria-label={`${callsLeft} of ${dailyLimit} calls left today`}>
          {dailyLimit <= 12 && (
            <div className="rc-quota-dots">
              {Array.from({ length: dailyLimit }).map((_, i) => <span key={i} className={i < callsLeft ? 'on' : ''} />)}
            </div>
          )}
          <span>{callsLeft === 0 ? "You've used today's calls — come back tomorrow" : `${callsLeft} of ${dailyLimit} calls left today`}</span>
        </div>
        {callsLeft === 0 && dailyLimit <= cfg.dailyCallLimit && (
          <button className="rc-btn rc-btn-link" onClick={() => nav(profile?.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium')}>
            Get more calls with Premium
          </button>
        )}
        {hoursSet && (
          <button className="rc-btn rc-btn-link" onClick={toggleReminders} disabled={savingReminder}>
            {profile?.callReminders ? 'Stop call-hour reminders' : 'Remind me when calls open'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="rc-wrap">{body}</div>
      </div>
    </>
  )
}
