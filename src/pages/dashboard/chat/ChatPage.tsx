import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import ChatSidebar from '../../../components/chat/ChatSidebar'
import ChatWindow from '../../../components/chat/ChatWindow'
import MaleTabs from '../../../components/MaleTabs'
import FemaleTabs from '../../../components/FemaleTabs'
import ProfileModal from '../../../components/chat/ProfileModal'
import ReportModal from '../../../components/chat/ReportModal'
import {
  createOrTouchThread,
  sendMessageByMatchId,
  blockUserInThreadByMatchId,
  unblockUserInThreadByMatchId,
  reportUserFromChat,
} from '../../../services/chatV2'
import '../../../styles/chat.css'

type UserDoc = {
  uid: string
  name?: string
  photoUrl?: string
  instagramId?: string
  bio?: string
  interests?: string[]
  college?: string
}

type MatchDoc = {
  id: string
  participants: string[]
  boyUid: string
  girlUid: string
  status?: string
  updatedAt?: any
  createdAt?: any
}

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function useIsMobile(breakpoint = 960) {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [breakpoint])
  return isMobile
}

export default function ChatPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const q = useQuery()
  const matchId = q.get('match') || undefined
  const isMobile = useIsMobile()

  const [matches, setMatches] = useState<MatchDoc[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<any[]>([])
  const [threadMeta, setThreadMeta] = useState<any>(undefined)
  const [showProfile, setShowProfile] = useState(false)
  const [showReport, setShowReport] = useState(false)

  // Load confirmed matches (list)
  useEffect(() => {
    if (!user) return
    const qMatches = query(
      collection(db, 'matches'),
      where('participants', 'array-contains', user.uid)
    )
    const stop = onSnapshot(qMatches, (snap) => {
      const ms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MatchDoc[]
      const confirmed = ms.filter((m) => (m.status ?? 'confirmed') === 'confirmed')
      setMatches(confirmed)
    })
    return () => stop()
  }, [user])

  // Load peer profiles for header and list
  useEffect(() => {
    if (!user || matches.length === 0) return
    const uids = Array.from(
      new Set(
        matches.map((m) => m.participants.find((p) => p !== user.uid)).filter(Boolean) as string[]
      )
    )
    const run = async () => {
      const entries = await Promise.all(
        uids.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid))
          if (snap.exists()) return [uid, { uid, ...(snap.data() as any) } as UserDoc] as const
          return undefined
        })
      )
      const map: Record<string, UserDoc> = {}
      for (const e of entries) if (e) map[e[0]] = e[1]
      setUsers(map)
    }
    void run()
  }, [user, matches])

  // Select from ?match=; on desktop auto-open first
  useEffect(() => {
    if (!user) return
    const init = async () => {
      if (matchId) {
        setSelectedMatchId(matchId)
        try { await createOrTouchThread(matchId) } catch {}
        return
      }
      if (!isMobile && matches.length > 0 && !selectedMatchId) {
        setSelectedMatchId(matches[0].id)
        try { await createOrTouchThread(matches[0].id) } catch {}
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user, matches.length, isMobile])

  // Subscribe thread meta (blocks, lastMessage, updatedAt)
  useEffect(() => {
    if (!selectedMatchId) { setThreadMeta(undefined); return }
    const stop = onSnapshot(doc(db, 'threads', selectedMatchId), (snap) => {
      setThreadMeta(snap.exists() ? { id: selectedMatchId, ...(snap.data() as any) } : { id: selectedMatchId })
    })
    return () => stop()
  }, [selectedMatchId])

  // Subscribe messages under threads/{matchId}/messages ordered by createdAtMs
  useEffect(() => {
    if (!selectedMatchId) { setMessages([]); return }
    const msgsQ = query(
      collection(db, 'threads', selectedMatchId, 'messages'),
      orderBy('createdAtMs', 'asc')
    )
    const stop = onSnapshot(msgsQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => stop()
  }, [selectedMatchId])

  // Build sidebar list from matches
  const sidebarItems = useMemo(() => {
    if (!user) return []
    const toMs = (t: any) =>
      typeof t?.toMillis === 'function'
        ? t.toMillis()
        : t instanceof Date
          ? t.getTime()
          : typeof t === 'number'
            ? t
            : 0
    const list = matches.map((m) => {
      const peerUid = m.participants.find((p) => p !== user.uid) || user.uid
      const u = users[peerUid]
      return {
        id: m.id,
        peerUid,
        name: u?.name || 'Unknown',
        photoUrl: u?.photoUrl,
        instagramId: u?.instagramId,
        lastText: '', // optional: you can hydrate from threadMeta cache if you store it
        active: selectedMatchId === m.id,
        sortTime: toMs(m.updatedAt) || toMs(m.createdAt),
      }
    })
    list.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
    return list
  }, [matches, users, user, selectedMatchId])

  // Select a chat
  const selectMatch = useCallback(async (id: string) => {
    setSelectedMatchId(id)
    try { await createOrTouchThread(id) } catch {}
    nav(`/dashboard/chat?match=${encodeURIComponent(id)}`, { replace: true })
  }, [nav])

  // Send handler (no first-message race with these rules)
  const onSend = useCallback(async (text: string) => {
    if (!user || !selectedMatchId) return
    try {
      await sendMessageByMatchId(selectedMatchId, user.uid, text)
    } catch (e) {
      console.error('sendMessage failed', e)
    }
  }, [selectedMatchId, user])

  // Mobile back
  const backToList = useCallback(() => {
    setSelectedMatchId(undefined)
    nav('/dashboard/chat', { replace: true })
  }, [nav])

  if (!user) return null
  const isFemale = profile?.gender === 'female'

  const selectedMatch = matches.find((m) => m.id === selectedMatchId)
  const selectedPeerUid = selectedMatch?.participants?.find((p) => p !== user.uid)
  const selectedPeer = selectedPeerUid ? users[selectedPeerUid] : undefined

  const iAmBlocked = !!threadMeta?.blocks && threadMeta.blocks[user.uid] === true
  const iBlockedThem = !!(selectedPeerUid && threadMeta?.blocks && threadMeta.blocks[selectedPeerUid] === true)

  const mobileClasses = isMobile ? `mobile ${selectedMatchId ? 'mobile-chat-open' : ''}` : ''

  return (
    <>
      <Navbar />
      <div className="container chat-page">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}

        <div className="chat-area">
          <div className={`chat-shell ${mobileClasses}`}>
            <ChatSidebar
              items={sidebarItems}
              onSelect={(peerOrId: string) => selectMatch(peerOrId)}
              currentUid={user.uid}
              users={users}
            />

            <div className="chat-main">
              {selectedMatchId ? (
                <>
                  <div className="chat-header">
                    <button className="back-btn" type="button" onClick={backToList} aria-label="Back to chats">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>

                    <button className="avatar as-button" onClick={() => setShowProfile(true)}>
                      {selectedPeer?.photoUrl
                        ? <img src={selectedPeer.photoUrl} alt={selectedPeer?.name || 'user'} />
                        : <div className="avatar-fallback">{(selectedPeer?.name || 'U').slice(0,1)}</div>}
                    </button>

                    <div className="peer-meta">
                      <div className="peer-name">{selectedPeer?.name || 'Chat'}</div>
                      <div className="peer-sub">@{selectedPeer?.instagramId || '—'}</div>
                    </div>

                    <div className="chat-actions">
                      {iBlockedThem ? (
                        <button className="btn small" onClick={async () => selectedPeerUid && await unblockUserInThreadByMatchId(selectedMatchId, selectedPeerUid)}>
                          Unblock
                        </button>
                      ) : (
                        <button className="btn small" onClick={async () => selectedPeerUid && await blockUserInThreadByMatchId(selectedMatchId, selectedPeerUid)}>
                          Block
                        </button>
                      )}
                      <button className="btn small danger" onClick={() => setShowReport(true)}>Report</button>
                    </div>
                  </div>

                  {iAmBlocked ? (
                    <div className="blocked-banner">You can’t message this person anymore.</div>
                  ) : null}

                  <ChatWindow currentUid={user.uid} messages={messages} onSend={iAmBlocked ? () => {} : onSend} />
                </>
              ) : (
                <div className="chat-empty">Select a connection to start chatting</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={selectedPeer} />
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={async (reason) => {
          if (!selectedMatchId || !selectedPeerUid) return
          await reportUserFromChat({ reporterUid: user.uid, reportedUid: selectedPeerUid, threadId: selectedMatchId, reason })
        }}
      />
    </>
  )
}