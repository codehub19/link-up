import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { 
  canUserMakeCall, 
  logSuccessfulCall, 
  updateCallStatus, 
  findAndJoinMatch, 
  watchMyQueueEntry, 
  leaveCallQueue 
} from '../../services/calls'
import { getPlanSyncOrNull } from '../../config/payments'
import { toast } from 'sonner'
import LoadingHeart from '../../components/LoadingHeart'
import HomeBackground from '../../components/home/HomeBackground'
import Navbar from '../../components/Navbar'
import './CallPage.styles.css'

export default function CallPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [callStarted, setCallStarted] = useState(false)
  const [timer, setTimer] = useState(0) // seconds
  const [maxDuration, setMaxDuration] = useState(8 * 60) // default 8 mins
  const [showChatButton, setShowChatButton] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Filters
  const [lookingForGender, setLookingForGender] = useState<string>('any')
  
  const timerRef = useRef<any>(null)
  const unsubRef = useRef<any>(null)

  useEffect(() => {
    const checkLimits = async () => {
      if (!user) return
      
      const { allowed, reason } = await canUserMakeCall(profile)
      if (!allowed) {
        toast.error(reason || 'Call not allowed')
        navigate('/dashboard/matches')
        return
      }

      const plan = profile?.planId ? getPlanSyncOrNull(profile.planId) : null
      if (plan?.maxCallDuration) {
        setMaxDuration(plan.maxCallDuration * 60)
      } else {
        setMaxDuration(8 * 60) // Free: 8 mins
      }
      
      setLoading(false)
    }
    
    checkLimits()
    return () => {
      if (unsubRef.current) unsubRef.current()
      if (user) leaveCallQueue(user.uid).catch(() => {})
    }
  }, [user, profile, navigate])

  const startRandomMatch = async () => {
    if (!user || !profile) return
    setMatching(true)
    
    try {
      const sid = await findAndJoinMatch(
        { uid: user.uid, gender: profile.gender || 'male' }, 
        lookingForGender
      )

      if (sid) {
        // We found an existing match!
        onMatchConnected(sid)
      } else {
        // We are now in the queue
        unsubRef.current = watchMyQueueEntry(user.uid, (matchedSid) => {
          onMatchConnected(matchedSid)
        })
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to start matching')
      setMatching(false)
    }
  }

  const onMatchConnected = (sid: string) => {
    setSessionId(sid)
    setMatching(false)
    setCallStarted(true)
    
    // Simulate connection lag
    setTimeout(async () => {
      await updateCallStatus(sid, 'connected')
      toast.success('Found a match! Connected.')
      
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          const next = prev + 1
          if (next >= 5 * 60) setShowChatButton(true)
          if (next >= maxDuration) {
            endCall()
            return prev
          }
          return next
        })
      }, 1000)
    }, 1000)
  }

  const endCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (unsubRef.current) unsubRef.current()
    if (user) await leaveCallQueue(user.uid)
    
    if (sessionId) {
      await updateCallStatus(sessionId, 'ended', timer)
      if (timer > 10) { // Consider successful if lasted more than 10 seconds
        await logSuccessfulCall(user!.uid)
      }
    }
    setCallStarted(false)
    setMatching(false)
    setTimer(0)
    setShowChatButton(false)
    toast.info('Call ended')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isPremium = !!profile?.planId

  if (loading) return (
    <div className="call-loading">
      <LoadingHeart size={60} />
      <p>Verifying call eligibility...</p>
    </div>
  )

  return (
    <div className="call-page-container">
      <HomeBackground />
      {!callStarted && <Navbar />}
      
      <main className={`call-main ${callStarted ? 'calling' : ''}`}>
        {!callStarted ? (
          <div className="call-entry-card glass">
            {matching ? (
              <div className="matching-state">
                <LoadingHeart size={80} />
                <h2>Looking for someone special...</h2>
                <p>Finding a random user who matches your vibes.</p>
                <button className="btn ghost" style={{ marginTop: '2rem' }} onClick={() => {
                  setMatching(false)
                  if (user) leaveCallQueue(user.uid)
                }}>
                  Stop Searching
                </button>
              </div>
            ) : (
              <>
                <div className="call-icon-pulse">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" opacity=".2"/>
                    <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1zM19 12h2c0-4.8-4-8.8-8.8-8.8v2c3.7 0 6.8 3.1 6.8 6.8z"/>
                  </svg>
                </div>
                <h1>Random Calling Date</h1>
                <p>Connect with a random student instantly!</p>
                
                <div className="filter-section">
                   <label>I want to talk to:</label>
                   <div className="gender-filters">
                      <button 
                        className={`filter-btn ${lookingForGender === 'any' ? 'active' : ''}`}
                        onClick={() => setLookingForGender('any')}
                      >Any</button>
                      
                      <button 
                        className={`filter-btn ${lookingForGender === 'male' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                        onClick={() => isPremium ? setLookingForGender('male') : toast.error('Gender filter is a premium feature!')}
                      >
                        {!isPremium && <span className="lock-icon">🔒</span>} Male
                      </button>

                      <button 
                        className={`filter-btn ${lookingForGender === 'female' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                        onClick={() => isPremium ? setLookingForGender('female') : toast.error('Gender filter is a premium feature!')}
                      >
                        {!isPremium && <span className="lock-icon">🔒</span>} Female
                      </button>
                   </div>
                </div>

                <div className="call-info-row">
                  <span className="info-chip">Max {Math.floor(maxDuration / 60)}m</span>
                  <span className="info-chip">Instant Connect</span>
                </div>

                <div className="call-actions">
                  <button className="btn nav-btn-primary call-btn" onClick={startRandomMatch}>
                    Start Random Call
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="call-active-ui glass">
            <div className="call-status-badge">Live Random Call</div>
            <div className="call-timer">{formatTime(timer)} / {formatTime(maxDuration)}</div>
            
            <div className="call-participant-area">
               <div className="participant-placeholder">
                 <div className="avatar-pulse"></div>
                 <span>Your Mystery Match</span>
                 <p className="mystery-text">Identity will be revealed after the call if you both match!</p>
               </div>
            </div>

            <div className="call-controls">
              <button className="call-control-btn end-call" onClick={endCall}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                   <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
              
              {showChatButton && (
                <button 
                  className="btn nav-btn-primary chat-transition-btn"
                  onClick={() => navigate(`/dashboard/matches`)} // Redirect to matches to see if they matched
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
