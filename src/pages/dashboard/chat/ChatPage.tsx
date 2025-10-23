import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import ChatSidebar from '../../../components/chat/ChatSidebar'
import ChatWindow from '../../../components/chat/ChatWindow'
import { ensureThread, sendMessage, threadIdFor } from '../../../services/chat'
import { reportUser } from '../../../services/chatModeration'
import MaleTabs from '../../../components/MaleTabs'
import FemaleTabs from '../../../components/FemaleTabs'
import ProfileModal from '../../../components/chat/ProfileModal'
import ReportModal from '../../../components/chat/ReportModal'
import { blockUser, unblockUser, subscribeAmIBlockedBy, subscribeBlockedUids } from '../../../services/blocks'
import FullScreenChat from './FullScreenChat'
import '../../../styles/chat.css'

type UserDoc = { uid: string; name?: string; photoUrl?: string; instagramId?: string; bio?: string; interests?: string[]; college?: string }
type ThreadDoc = { id: string; participants: string[]; lastMessage?: { text: string; senderUid: string; at?: any } | null; updatedAt?: any }
type MatchDoc = { id: string; participants: string[]; boyUid: string; girlUid: string; status?: string }

function useQuery() { return new URLSearchParams(useLocation().search) }
function useIsMobile(breakpoint = 650) {
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false))
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [breakpoint])
  return isMobile
}

export default function ChatPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const q = useQuery()
  const withUid = q.get('with') || undefined
  const isMobile = useIsMobile()

  const [threads, setThreads] = useState<ThreadDoc[]>([])
  const [matches, setMatches] = useState<MatchDoc[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<any[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [showReport, setShowReport] = useState(false)

  // Block state (list-based)
  const [myBlockedSet, setMyBlockedSet] = useState<Set<string>>(new Set())
  const [peerBlocksMe, setPeerBlocksMe] = useState<boolean>(false)

  useEffect(() => {
    if (!user) return
    const threadsQ = query(
      collection(db, 'threads'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    )
    const stop = onSnapshot(threadsQ, (snap) => {
      const ts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setThreads(ts as ThreadDoc[])
    })
    return () => stop()
  }, [user])

  useEffect(() => {
    if (!user) return
    const matchesQ = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid))
    const stop = onSnapshot(matchesQ, (snap) => {
      const ms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      const confirmed = ms.filter((m) => (m.status ?? 'confirmed') === 'confirmed')
      setMatches(confirmed)
    })
    return () => stop()
  }, [user])

  // Subscribe to my block list
  useEffect(() => {
    if (!user) return
    const stop = subscribeBlockedUids(user.uid, (set) => setMyBlockedSet(set))
    return () => stop()
  }, [user])

  // Subscribe to whether selected peer has blocked me
  useEffect(() => {
    if (!user) return
    const peer = (() => {
      if (!selectedId) return undefined
      const [a, b] = selectedId.split('_')
      return a === user.uid ? b : a
    })()
    if (!peer) return
    const stop = subscribeAmIBlockedBy(peer, user.uid, (is) => setPeerBlocksMe(is))
    return () => stop()
  }, [user, selectedId])

  useEffect(() => {
    if (!user) return
    const peerUids = new Set<string>()
    for (const m of matches) {
      const p = m.participants?.find((p: string) => p !== user.uid)
      if (p) peerUids.add(p)
    }
    for (const t of threads) {
      const p = t.participants?.find((p: string) => p !== user.uid)
      if (p) peerUids.add(p)
    }
    if (peerUids.size === 0) return

    const run = async () => {
      const pairs = await Promise.all(Array.from(peerUids).map(async (uid) => {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) return [uid, { uid, ...(snap.data() as any) } as UserDoc] as const
        return undefined
      }))
      const map: Record<string, UserDoc> = {}
      for (const p of pairs) if (p) map[p[0]] = p[1]
      setUsers(map)
    }
    run()
  }, [user, matches, threads])

  const list = useMemo(() => {
    if (!user) return []
    const toMs = (t: any) => (typeof t?.toMillis === 'function' ? t.toMillis() : (t instanceof Date ? t.getTime() : 0))
    const threadMap = new Map<string, {
      peerUid: string
      threadId: string
      lastMessage: string
      updatedAt: any
    }>()
    matches.forEach((m) => {
      const peerUid = m.participants.find((p: string) => p !== user.uid)!
      const tid = threadIdFor(user.uid, peerUid)
      const t = threads.find((x) => x.id === tid)
      if (!threadMap.has(tid)) {
        threadMap.set(tid, {
          peerUid,
          threadId: tid,
          lastMessage: t?.lastMessage?.text || '',
          updatedAt: (t as any)?.updatedAt || null,
        })
      }
    })
    return Array.from(threadMap.values()).sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt))
  }, [matches, threads, user])

  useEffect(() => {
    if (!user) return
    const init = async () => {
      if (withUid && withUid !== user.uid) {
        const tid = threadIdFor(user.uid, withUid)
        setSelectedId(tid)
        try { await ensureThread(user.uid, withUid) } catch {}
        return
      }
      if (!withUid && !isMobile && list.length > 0 && !selectedId) {
        setSelectedId(list[0].threadId)
      }
    }
    init()
  }, [withUid, user, list.length, isMobile])

  useEffect(() => {
    if (!selectedId) return
    const msgsQ = query(collection(db, 'threads', selectedId, 'messages'), orderBy('createdAtMs', 'asc'))
    const stop = onSnapshot(msgsQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => stop()
  }, [selectedId])

  const onSend = async (text: string) => {
    if (!user || !selectedId) return
    if (peerBlocksMe) return
    const [a, b] = selectedId.split('_')
    const peerUid = a === user.uid ? b : a
    if (myBlockedSet.has(peerUid)) return
    await sendMessage(selectedId, user.uid, text)
  }

  const selectPeer = useCallback(async (peerUid: string) => {
    if (!user) return
    const tid = threadIdFor(user.uid, peerUid)
    setSelectedId(tid)
    try { await ensureThread(user.uid, peerUid) } catch {}
    nav(`/dashboard/chat?with=${encodeURIComponent(peerUid)}`, { replace: true })
  }, [nav, user])

  const backToList = useCallback(() => {
    setSelectedId(undefined)
    nav('/dashboard/chat', { replace: true })
  }, [nav])

  const selectedThread: ThreadDoc | undefined = useMemo(
    () => threads.find((t) => t.id === selectedId),
    [threads, selectedId]
  )

  const selectedPeer: UserDoc | undefined = useMemo(() => {
    if (!user || !selectedId) return undefined
    const parts = selectedId.split('_')
    const peerUid = parts[0] === user.uid ? parts[1] : parts[0]
    return users[peerUid]
  }, [selectedId, users, user])

  const iAmBlocked = peerBlocksMe
  const iBlockedThem = useMemo(() => {
    if (!user || !selectedPeer) return false
    return myBlockedSet.has(selectedPeer.uid)
  }, [myBlockedSet, selectedPeer, user])

  if (!user) return null
  const isFemale = profile?.gender === 'female'
  const isMobileView = isMobile

  // Compose chat header for FullScreenChat
  const chatHeader = selectedId && selectedPeer && (
    <>
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
          <button
            className="btn small"
            onClick={async () => {
              if (!selectedPeer) return
              await unblockUser(user.uid, selectedPeer.uid)
            }}
          >
            Unblock
          </button>
        ) : (
          <button
            className="btn small"
            onClick={async () => {
              if (!selectedPeer) return
              await blockUser(user.uid, selectedPeer.uid)
            }}
          >
            Block
          </button>
        )}
        <button className="btn small danger" onClick={() => setShowReport(true)}>Report</button>
      </div>
    </>
  )

  // Full screen chat for mobile and a user is selected
  if (isMobileView && selectedId && selectedPeer) {
    return (
      <>
        <FullScreenChat
          currentUid={user.uid}
          messages={messages}
          onSend={iAmBlocked || iBlockedThem ? () => {} : async (t) => onSend(t)}
          header={chatHeader}
        />
        <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={selectedPeer} />
        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          onSubmit={async (reason) => {
            if (!selectedPeer || !selectedId) return
            await reportUser({
              reporterUid: user.uid,
              reportedUid: selectedPeer.uid,
              threadId: selectedId,
              reason,
            })
          }}
        />
      </>
    )
  }

  // Normal desktop layout
  return (
    <>
      <Navbar />
      <div className="container chat-page">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}
        <div className="chat-area">
          <div className={`chat-shell ${isMobileView ? `mobile ${selectedId ? 'mobile-chat-open' : ''}` : ''}`}>
            <ChatSidebar
              items={list.map((i) => {
                const u = users[i.peerUid]
                const blocked = myBlockedSet.has(i.peerUid)
                return {
                  id: i.threadId,
                  peerUid: i.peerUid,
                  name: u?.name || 'Unknown',
                  photoUrl: u?.photoUrl,
                  instagramId: u?.instagramId,
                  lastText: blocked ? 'You blocked this user' : (i.lastMessage || 'Say hi 👋'),
                  active: selectedId === i.threadId,
                }
              })}
              onSelect={(peerUid) => selectPeer(peerUid)}
            />
            <div className="chat-main">
              {selectedId ? (
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
                        <button
                          className="btn small"
                          onClick={async () => {
                            if (!selectedPeer) return
                            await unblockUser(user.uid, selectedPeer.uid)
                          }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          className="btn small"
                          onClick={async () => {
                            if (!selectedPeer) return
                            await blockUser(user.uid, selectedPeer.uid)
                          }}
                        >
                          Block
                        </button>
                      )}
                      <button className="btn small danger" onClick={() => setShowReport(true)}>Report</button>
                    </div>
                  </div>

                  {iAmBlocked ? (
                    <div className="blocked-banner">
                      You can’t message this person anymore.
                    </div>
                  ) : null}

                  {iBlockedThem ? (
                    <div className="blocked-banner">
                      You have blocked this person. Unblock to resume chatting.
                    </div>
                  ) : null}

                  <ChatWindow
                    currentUid={user.uid}
                    messages={messages}
                    onSend={iAmBlocked || iBlockedThem ? () => {} : async (t) => onSend(t)}
                  />
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
          if (!selectedPeer || !selectedId) return
          await reportUser({
            reporterUid: user.uid,
            reportedUid: selectedPeer.uid,
            threadId: selectedId,
            reason,
          })
        }}
      />
    </>
  )
}