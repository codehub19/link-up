import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import {
  HEARTBEAT_MS,
  REJOIN_MS,
  RandomCallDoc,
  RandomCallSession,
  declineCall,
  joinRandomCallQueue,
  leaveRandomCallQueue,
  sendQueueHeartbeat,
  startMatchCall,
  submitCallDecision,
  subscribeIncomingCalls,
  subscribeQueueEntry,
  subscribeRandomCall,
  prefetchIceServers,
} from '../services/randomCall'
import { playConnected, playEnded, startRingback, startRingtone, unlockAudio } from '../utils/callSounds'
import { track } from '../utils/analytics'
import { photoOf } from '../utils/avatar'

/*
 * Calls belong to the app, not to a page. Starting or answering a call is an
 * action (never a URL), so going Back can't dial anyone again, and the call
 * keeps running while you move around the app (the call screen shrinks to a
 * bubble).
 */

export type CallPhase = 'idle' | 'incoming' | 'searching' | 'connecting' | 'in-call' | 'ended'
export type CallPeer = { uid: string; name?: string; photoUrl?: string; college?: string; dob?: string }

const CONNECT_TIMEOUT_MS = 35_000
// Calls to a match ring on the other person's phone first, so allow longer
const RING_TIMEOUT_MS = 45_000
// Ignore rings older than this (e.g. the caller closed the app without hanging up)
const RING_MAX_AGE_MS = 60_000

type CallState = {
  phase: CallPhase
  peer: CallPeer | null
  call: RandomCallDoc | null
  callId: string | null
  /** A call with a match or friend (rings them) rather than a random stranger */
  isMatchCall: boolean
  /** I placed this call */
  outgoing: boolean
  muted: boolean
  minimized: boolean
  connectedAt: number | null
  wasConnected: boolean
  /** Connection dropped and is being restored */
  reconnecting: boolean
  notice: string | null
  /** Set when the server says a phone number must be verified for random calls */
  needsPhone: boolean
  /** Waiting for the server to start a random search */
  joining: boolean
  now: number
}

type CallApi = CallState & {
  /** Seconds left before the call's hard limit */
  remainingSec: number
  /** Seconds since the call connected */
  elapsedSec: number
  callPerson: (peerUid: string, hint?: Partial<CallPeer>) => void
  startRandom: () => Promise<void>
  cancelSearch: () => void
  answer: () => void
  decline: () => void
  hangUp: () => void
  toggleMute: () => void
  decide: (d: 'like' | 'pass') => Promise<void>
  dismiss: () => void
  minimize: () => void
  expand: () => void
  setNeedsPhone: (v: boolean) => void
}

const CallContext = createContext<CallApi | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used inside CallProvider')
  return ctx
}

const INITIAL: Omit<CallState, 'needsPhone' | 'now'> = {
  phase: 'idle',
  peer: null,
  call: null,
  callId: null,
  isMatchCall: false,
  outgoing: false,
  muted: false,
  minimized: false,
  connectedAt: null,
  wasConnected: false,
  reconnecting: false,
  notice: null,
  joining: false,
}

/** Server messages are shown as-is; low-level ones ("internal", network) get a friendly line. */
function friendly(e: any, fallback: string) {
  const code = String(e?.code || '')
  const msg = String(e?.message || '')
  if (!msg || /internal|unavailable|deadline|unknown/.test(code) || /^[a-z-]+$/.test(msg)) return fallback
  return msg
}

async function loadPeer(uid: string): Promise<CallPeer | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const d = snap.data() as any
    return { uid, ...d, photoUrl: photoOf({ ...d, uid }) }
  } catch {
    return null
  }
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const loc = useLocation()

  const [s, setS] = useState<CallState>({ ...INITIAL, needsPhone: false, now: Date.now() })
  const set = useCallback((patch: Partial<CallState> | ((p: CallState) => Partial<CallState>)) => {
    setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])
  const stateRef = useRef(s)
  stateRef.current = s

  const sessionRef = useRef<RandomCallSession | null>(null)
  const incomingRef = useRef<RandomCallDoc | null>(null)

  const reset = useCallback(() => {
    incomingRef.current = null
    setS((prev) => ({ ...INITIAL, needsPhone: prev.needsPhone, now: Date.now() }))
  }, [])

  const endSession = useCallback(async (reason?: string, notice?: string) => {
    const session = sessionRef.current
    sessionRef.current = null
    const was = stateRef.current.phase
    set((p) => ({ phase: 'ended', muted: false, minimized: false, notice: notice ?? p.notice }))
    if (was === 'in-call' || was === 'connecting') playEnded()
    if (session) await session.close(reason)
  }, [set])

  /* ---------------- Incoming calls (from matches and friends) ---------------- */
  useEffect(() => {
    if (!uid) return
    return subscribeIncomingCalls(uid, (calls) => {
      const fresh = calls
        .filter((c) => c.type === 'match')
        .filter((c: any) => Date.now() - (c.createdAt?.toMillis?.() ?? Date.now()) < RING_MAX_AGE_MS)
      const cur = stateRef.current

      // The call I'm being rung for went away before I answered: the caller gave up
      if (cur.phase === 'incoming' && incomingRef.current && !fresh.some((c) => c.id === incomingRef.current!.id)) {
        const name = cur.peer?.name?.split(' ')[0]
        toast(`Missed call${name ? ` from ${name}` : ''}`)
        reset()
        return
      }

      for (const c of fresh) {
        if (c.id === cur.callId || c.id === incomingRef.current?.id) continue
        if (cur.phase === 'idle' || cur.phase === 'ended') {
          incomingRef.current = c
          prefetchIceServers()
          set({ ...INITIAL, phase: 'incoming', callId: null, isMatchCall: true, peer: { uid: c.callerUid } })
          loadPeer(c.callerUid).then((p) => {
            if (p && incomingRef.current?.id === c.id) set({ peer: p })
          })
          break
        } else {
          // Already on a call: tell the caller we're busy
          declineCall(c.id, uid, 'busy').catch(() => { })
        }
      }
    })
  }, [uid, set, reset])

  const answer = useCallback(() => {
    const c = incomingRef.current
    if (!c) return
    unlockAudio()
    incomingRef.current = null
    set({ phase: 'connecting', callId: c.id, isMatchCall: true, outgoing: false, minimized: false })
  }, [set])

  const decline = useCallback(() => {
    const c = incomingRef.current
    if (c && uid) declineCall(c.id, uid).catch(() => { })
    reset()
  }, [uid, reset])

  /* ---------------- Placing a call to a match or friend ---------------- */
  const callPerson = useCallback((peerUid: string, hint?: Partial<CallPeer>) => {
    const cur = stateRef.current
    if (cur.phase !== 'idle' && cur.phase !== 'ended') {
      if (cur.peer?.uid === peerUid) set({ minimized: false })
      else toast("You're already on a call.")
      return
    }
    unlockAudio()
    prefetchIceServers()
    incomingRef.current = null
    set({ ...INITIAL, phase: 'connecting', isMatchCall: true, outgoing: true, peer: { uid: peerUid, ...hint } })
    loadPeer(peerUid).then((p) => { if (p && stateRef.current.peer?.uid === peerUid) set({ peer: p }) })
    startMatchCall(peerUid)
      .then((res) => {
        // Hung up before the server answered: end the call we just created
        if (stateRef.current.phase !== 'connecting' || stateRef.current.peer?.uid !== peerUid) {
          if (uid) declineCall(res.callId, uid).catch(() => { })
          return
        }
        set({ callId: res.callId })
      })
      .catch((e) => {
        if (stateRef.current.peer?.uid !== peerUid) return
        toast.error(friendly(e, 'Could not start the call. Check your connection and try again.'))
        reset()
      })
  }, [uid, set, reset])

  /* ---------------- Random calls ---------------- */
  const startRandom = useCallback(async () => {
    const cur = stateRef.current
    if (!uid || cur.joining) return
    if (cur.phase !== 'idle' && cur.phase !== 'ended') { set({ minimized: false }); return }
    unlockAudio()
    incomingRef.current = null
    prefetchIceServers()
    set({ ...INITIAL, phase: 'searching', joining: true })
    try {
      const res = await joinRandomCallQueue()
      if (stateRef.current.phase !== 'searching') {
        // Cancelled while we were joining
        leaveRandomCallQueue(uid)
        return
      }
      if (res.status === 'matched') set({ callId: res.callId, phase: 'connecting' })
    } catch (e: any) {
      if (e?.details?.reason === 'phone') set({ needsPhone: true })
      toast.error(friendly(e, 'Could not start a call. Check your connection and try again.'))
      reset()
    } finally {
      set({ joining: false })
    }
  }, [uid, set, reset])

  const cancelSearch = useCallback(() => {
    if (uid) leaveRandomCallQueue(uid)
    reset()
  }, [uid, reset])

  // While searching: heartbeat + wait for the server to pair us
  useEffect(() => {
    if (!uid || s.phase !== 'searching') return
    const stop = subscribeQueueEntry(uid, (entry) => {
      if (entry?.status === 'matched' && entry.callId && stateRef.current.phase === 'searching') {
        set({ callId: entry.callId, phase: 'connecting' })
      }
    })
    const hb = setInterval(() => sendQueueHeartbeat(uid).catch(() => { }), HEARTBEAT_MS)
    const rejoin = setInterval(() => {
      if (stateRef.current.phase !== 'searching' || stateRef.current.joining) return
      joinRandomCallQueue({ rejoin: true })
        .then((res) => {
          if (res.status === 'matched' && stateRef.current.phase === 'searching') set({ callId: res.callId, phase: 'connecting' })
        })
        .catch(() => { })
    }, REJOIN_MS)
    return () => { stop(); clearInterval(hb); clearInterval(rejoin) }
  }, [uid, s.phase, set])

  /* ---------------- The call itself ---------------- */
  useEffect(() => {
    if (!uid || !s.callId) return
    leaveRandomCallQueue(uid)
    const id = s.callId
    const stop = subscribeRandomCall(id, (call) => {
      if (stateRef.current.callId === id) set({ call })
    })
    return () => stop()
  }, [uid, s.callId, set])

  // Start WebRTC once the call doc arrives
  useEffect(() => {
    const call = s.call
    if (!uid || !call || sessionRef.current || stateRef.current.phase !== 'connecting') return
    const peerUid = call.participants.find((p) => p !== uid)
    if (!peerUid) return
    if (call.status === 'ended') {
      // e.g. answering a call the caller already hung up
      set({ phase: 'ended', notice: 'This call has ended.' })
      return
    }
    set({ isMatchCall: call.type === 'match' })
    if (stateRef.current.peer?.uid !== peerUid || !stateRef.current.peer?.name) {
      loadPeer(peerUid).then((p) => { if (p && stateRef.current.callId === call.id) set({ peer: p }) })
    }

    const session = new RandomCallSession(call.id, uid, peerUid, call.callerUid === uid, (st) => {
      if (st === 'connected') {
        if (stateRef.current.phase !== 'in-call') { playConnected(); track('call_connected', { type: call.type || 'random' }) }
        set((p) => ({ connectedAt: p.connectedAt ?? Date.now(), wasConnected: true, reconnecting: false, phase: 'in-call' }))
      } else if (st === 'reconnecting') {
        set({ reconnecting: true })
      } else if (st === 'failed' && sessionRef.current === session) {
        const wasLive = stateRef.current.wasConnected
        endSession('failed', wasLive
          ? 'The connection dropped. Check your internet and call again.'
          : 'Couldn’t connect. Your network may be blocking calls — try switching between Wi-Fi and mobile data.')
      }
    })
    sessionRef.current = session
    session.start().catch((e) => {
      console.error(e)
      endSession('mic_error', e?.name === 'NotAllowedError'
        ? 'Microphone access is needed for voice calls. Allow it in your browser settings and try again.'
        : 'Could not start the call.')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, s.call?.id])

  // The other person hung up / declined / was busy
  useEffect(() => {
    const call = s.call
    if (call?.status !== 'ended' || !sessionRef.current) return
    const name = stateRef.current.peer?.name?.split(' ')[0] || 'They'
    let notice: string | undefined
    if (!stateRef.current.wasConnected) {
      if (call.endReason === 'declined') notice = `${name} can't talk right now.`
      else if (call.endReason === 'busy') notice = `${name} is on another call.`
      else notice = `${name} couldn't connect.`
    }
    endSession(undefined, notice)
  }, [s.call?.status, s.call?.endReason, endSession])

  // No answer / couldn't connect. The clock restarts once the call is answered, so a
  // long ring doesn't eat into the time needed to connect.
  const answered = s.call?.status === 'active'
  useEffect(() => {
    if (s.phase !== 'connecting') return
    const ringing = s.isMatchCall && !answered
    const t = setTimeout(() => {
      if (stateRef.current.phase !== 'connecting') return
      if (!sessionRef.current) {
        // Never got as far as a session (e.g. the server was slow)
        const id = stateRef.current.callId
        if (id && uid) declineCall(id, uid).catch(() => { })
        set({ phase: 'ended', notice: 'No answer. Try again later.' })
        playEnded()
        return
      }
      if (!ringing) sessionRef.current.reportFailed()
      endSession(ringing ? 'no_answer' : 'failed', ringing
        ? 'No answer. Try again later.'
        : 'Couldn’t connect. Your network may be blocking calls — try switching between Wi-Fi and mobile data.')
    }, ringing ? RING_TIMEOUT_MS : CONNECT_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [s.phase, s.isMatchCall, answered, endSession, set, uid])

  // Clock
  useEffect(() => {
    if (s.phase !== 'in-call' && s.phase !== 'connecting') return
    const i = setInterval(() => set({ now: Date.now() }), 500)
    return () => clearInterval(i)
  }, [s.phase, set])

  const maxSec = s.call?.maxDurationSec ?? 300
  const elapsedSec = s.connectedAt ? Math.max(0, (s.now - s.connectedAt) / 1000) : 0
  const remainingSec = maxSec - elapsedSec
  useEffect(() => {
    if (s.phase === 'in-call' && remainingSec <= 0) endSession('time_limit', "Time's up!")
  }, [s.phase, remainingSec, endSession])

  const hangUp = useCallback(() => {
    const cur = stateRef.current
    if (cur.phase === 'searching') { cancelSearch(); return }
    if (cur.phase === 'incoming') { decline(); return }
    if (!sessionRef.current) {
      // Still waiting for the server / call doc: end what exists and close the screen
      if (cur.callId && uid) declineCall(cur.callId, uid).catch(() => { })
      reset()
      return
    }
    endSession('hangup')
  }, [cancelSearch, decline, endSession, reset, uid])

  const toggleMute = useCallback(() => {
    const next = !stateRef.current.muted
    sessionRef.current?.setMuted(next)
    set({ muted: next })
  }, [set])

  const decide = useCallback(async (d: 'like' | 'pass') => {
    const id = stateRef.current.callId
    if (!uid || !id) return
    try {
      await submitCallDecision(id, uid, d)
    } catch {
      toast.error('Could not save your choice. Please try again.')
    }
  }, [uid])

  /* ---------------- Sounds ---------------- */
  const ringingOut = s.phase === 'connecting' && s.isMatchCall && s.outgoing && (!s.call || s.call.status === 'ringing')
  useEffect(() => {
    if (!ringingOut) return
    return startRingback()
  }, [ringingOut])
  useEffect(() => {
    if (s.phase !== 'incoming') return
    return startRingtone()
  }, [s.phase])

  /* ---------------- Navigation ---------------- */
  // Moving around the app shrinks the call to a bubble; a finished call's screen closes.
  const firstLoc = useRef(true)
  useEffect(() => {
    if (firstLoc.current) { firstLoc.current = false; return }
    const cur = stateRef.current
    if (cur.phase === 'ended') reset()
    else if (cur.phase === 'searching' || cur.phase === 'connecting' || cur.phase === 'in-call') set({ minimized: true })
  }, [loc.key, reset, set])

  // Closing the tab or signing out ends the call for the other person too
  useEffect(() => {
    const onHide = (e: PageTransitionEvent) => {
      if (e.persisted) return
      sessionRef.current?.close('left')
      sessionRef.current = null
      if (uid && stateRef.current.phase === 'searching') leaveRandomCallQueue(uid)
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.phase === 'in-call') { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [uid])

  useEffect(() => {
    if (uid) return
    sessionRef.current?.close('left')
    sessionRef.current = null
    reset()
  }, [uid, reset])

  // A ban mid-search stops the search
  useEffect(() => {
    if (profile?.banned && stateRef.current.phase === 'searching') cancelSearch()
  }, [profile?.banned, cancelSearch])

  const api = useMemo<CallApi>(() => ({
    ...s,
    remainingSec,
    elapsedSec,
    callPerson,
    startRandom,
    cancelSearch,
    answer,
    decline,
    hangUp,
    toggleMute,
    decide,
    dismiss: reset,
    minimize: () => set({ minimized: true }),
    expand: () => set({ minimized: false }),
    setNeedsPhone: (v: boolean) => set({ needsPhone: v }),
  }), [s, remainingSec, elapsedSec, callPerson, startRandom, cancelSearch, answer, decline, hangUp, toggleMute, decide, reset, set])

  return <CallContext.Provider value={api}>{children}</CallContext.Provider>
}
