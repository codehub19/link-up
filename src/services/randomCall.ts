import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'

export type RandomCallDecision = 'like' | 'pass'

export type RandomCallDoc = {
  id: string
  type?: 'random' | 'match'
  participants: string[]
  callerUid: string
  calleeUid: string
  status: 'ringing' | 'connecting' | 'active' | 'ended'
  maxDurationSec: number
  chatWindowHours?: number
  offer?: { type: RTCSdpType; sdp: string }
  answer?: { type: RTCSdpType; sdp: string }
  decisions?: Record<string, RandomCallDecision>
  connected?: boolean
  threadId?: string
  endedBy?: string
  endReason?: string
}

export type QueueEntry = {
  status: 'waiting' | 'matched'
  callId: string | null
}

export type JoinResult =
  | { status: 'waiting'; maxCallSeconds: number }
  | { status: 'matched'; callId: string; maxCallSeconds: number }

export const HEARTBEAT_MS = 10_000
export const REJOIN_MS = 20_000

export async function joinRandomCallQueue(opts?: { rejoin?: boolean }): Promise<JoinResult> {
  const fn = httpsCallable<unknown, JoinResult>(functions, 'joinRandomCallQueue')
  const res = await fn({ rejoin: !!opts?.rejoin })
  return res.data
}

/** Call someone you're matched with; their app rings. */
export async function startMatchCall(peerUid: string): Promise<{ callId: string; maxCallSeconds: number }> {
  const fn = httpsCallable<unknown, { callId: string; maxCallSeconds: number }>(functions, 'startMatchCall')
  const res = await fn({ peerUid })
  return res.data
}

/** Ringing calls addressed to this user. */
export function subscribeIncomingCalls(uid: string, cb: (calls: RandomCallDoc[]) => void) {
  const q = query(collection(db, 'randomCalls'), where('calleeUid', '==', uid), where('status', '==', 'ringing'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as RandomCallDoc)), () => cb([]))
}

export async function declineCall(callId: string, uid: string) {
  await updateDoc(doc(db, 'randomCalls', callId), {
    status: 'ended',
    endedAt: serverTimestamp(),
    endedBy: uid,
    endReason: 'declined',
  })
}

export async function unlockRandomChat(threadId: string) {
  const fn = httpsCallable(functions, 'unlockRandomChat')
  await fn({ threadId })
}

export function subscribeQueueEntry(uid: string, cb: (entry: QueueEntry | null) => void) {
  return onSnapshot(doc(db, 'callQueue', uid), (snap) => cb(snap.exists() ? (snap.data() as QueueEntry) : null))
}

export async function sendQueueHeartbeat(uid: string) {
  await updateDoc(doc(db, 'callQueue', uid), { heartbeatAt: serverTimestamp() })
}

export async function leaveRandomCallQueue(uid: string) {
  await deleteDoc(doc(db, 'callQueue', uid)).catch(() => { })
}

export function subscribeRandomCall(callId: string, cb: (call: RandomCallDoc | null) => void) {
  return onSnapshot(doc(db, 'randomCalls', callId), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as RandomCallDoc) : null)
  )
}

export async function submitCallDecision(callId: string, uid: string, decision: RandomCallDecision) {
  await updateDoc(doc(db, 'randomCalls', callId), { [`decisions.${uid}`]: decision })
}

export function subscribeRandomCallStats(uid: string, cb: (stats: { day?: string; calls?: number } | null) => void) {
  return onSnapshot(doc(db, 'randomCallStats', uid), (snap) => cb(snap.exists() ? (snap.data() as any) : null), () => cb(null))
}

export function subscribeRandomCallConfig(cb: (cfg: Record<string, any> | null) => void) {
  return onSnapshot(doc(db, 'config', 'randomCall'), (snap) => cb(snap.exists() ? snap.data() : null), () => cb(null))
}

/* ----------------------------------------------------------------------------
 * WebRTC (audio only). Media flows peer-to-peer; Firestore only carries signaling.
 * A TURN server is optional but recommended for users behind strict NATs.
 * ------------------------------------------------------------------------- */
function envTurnServers(): RTCIceServer[] {
  const turnUrl = import.meta.env.VITE_TURN_URL
  if (!turnUrl) return []
  return [{
    urls: turnUrl.split(',').map((u: string) => u.trim()),
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  }]
}

// TURN credentials from the getTurnCredentials function are short-lived; reuse for 50 min.
let turnCache: { at: number; servers: RTCIceServer[] } | null = null
async function serverTurnServers(): Promise<RTCIceServer[]> {
  if (turnCache && Date.now() - turnCache.at < 50 * 60 * 1000) return turnCache.servers
  try {
    const fn = httpsCallable<unknown, { iceServers: RTCIceServer[] }>(functions, 'getTurnCredentials')
    const res = await fn({})
    turnCache = { at: Date.now(), servers: res.data.iceServers || [] }
  } catch {
    turnCache = { at: Date.now(), servers: [] }
  }
  return turnCache.servers
}

async function iceServers(): Promise<RTCIceServer[]> {
  return [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...envTurnServers(),
    ...(await serverTurnServers()),
  ]
}

export type CallConnectionState = 'connecting' | 'connected' | 'failed' | 'closed'

export class RandomCallSession {
  private pc: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private unsubs: Array<() => void> = []
  private closed = false
  readonly remoteAudio = new Audio()

  constructor(
    private callId: string,
    private myUid: string,
    private peerUid: string,
    private isCaller: boolean,
    private onState: (s: CallConnectionState) => void
  ) {
    this.remoteAudio.autoplay = true
  }

  async start() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const pc = new RTCPeerConnection({ iceServers: await iceServers() })
    this.pc = pc

    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!))

    pc.ontrack = (e) => {
      this.remoteAudio.srcObject = e.streams[0]
      this.remoteAudio.play().catch(() => { })
    }
    pc.onconnectionstatechange = () => {
      if (this.closed) return
      const s = pc.connectionState
      if (s === 'connected') this.onState('connected')
      else if (s === 'failed') this.onState('failed')
    }

    const callRef = doc(db, 'randomCalls', this.callId)
    const candidatesCol = collection(db, 'randomCalls', this.callId, 'candidates')

    pc.onicecandidate = (e) => {
      if (!e.candidate || this.closed) return
      addDoc(candidatesCol, { from: this.myUid, candidate: e.candidate.toJSON(), createdAt: serverTimestamp() }).catch(() => { })
    }

    // Remote ICE candidates may arrive before the remote description; buffer them.
    const pending: RTCIceCandidateInit[] = []
    const flush = () => {
      while (pending.length) pc.addIceCandidate(pending.shift()!).catch(() => { })
    }
    this.unsubs.push(
      onSnapshot(query(candidatesCol, where('from', '==', this.peerUid)), (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type !== 'added') return
          const c = ch.doc.data().candidate as RTCIceCandidateInit
          if (pc.remoteDescription) pc.addIceCandidate(c).catch(() => { })
          else pending.push(c)
        })
      })
    )

    if (this.isCaller) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await updateDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp } })
    }

    this.unsubs.push(
      onSnapshot(callRef, async (snap) => {
        const call = snap.data() as RandomCallDoc | undefined
        if (!call || this.closed) return
        try {
          if (this.isCaller && call.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(call.answer)
            flush()
          }
          if (!this.isCaller && call.offer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(call.offer)
            flush()
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: 'active', startedAt: serverTimestamp() })
          }
        } catch (e) {
          console.error('Random call signaling failed', e)
          this.onState('failed')
        }
      })
    )
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = !muted })
  }

  /** Tear down media. Pass a reason to also mark the call ended for the peer. */
  async close(reason?: string) {
    if (this.closed) return
    this.closed = true
    this.unsubs.forEach((u) => u())
    this.unsubs = []
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.pc?.close()
    this.remoteAudio.srcObject = null
    this.onState('closed')
    if (reason) {
      await updateDoc(doc(db, 'randomCalls', this.callId), {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedBy: this.myUid,
        endReason: reason,
      }).catch(() => { })
    }
  }
}
