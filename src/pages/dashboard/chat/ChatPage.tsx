import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { ref as dbRef, onValue } from 'firebase/database'
import Navbar from '../../../components/Navbar'
import HomeBackground from '../../../components/home/HomeBackground'
import { useAuth } from '../../../state/AuthContext'
import { db, rtdb } from '../../../firebase'
import ChatList, { Avatar, ChatListItem } from '../../../components/chat/ChatList'
import ChatWindow, { ChatMessage } from '../../../components/chat/ChatWindow'
import ProfileModal from '../../../components/chat/ProfileModal'
import ReportModal from '../../../components/chat/ReportModal'
import { ensureThread, sendMessage, threadIdFor, setTypingStatus, markThreadAsRead, toggleLikeMessage } from '../../../services/chat'
import { reportUser } from '../../../services/chatModeration'
import { blockUser, unblockUser, subscribeAmIBlockedBy, subscribeBlockedUids } from '../../../services/blocks'
import { unlockRandomChat } from '../../../services/randomCall'
import { useDialog } from '../../../components/ui/Dialog'
import '../../../styles/chat.css'

type UserDoc = { uid: string; name?: string; photoUrl?: string; instagramId?: string; bio?: string; interests?: string[]; college?: string; collegeId?: { verified?: boolean } }
type ThreadDoc = {
  id: string
  participants: string[]
  lastMessage?: { text: string; senderUid: string; at?: any } | null
  updatedAt?: any
  createdAt?: any
  blocks?: Record<string, boolean>
  typing?: Record<string, any>
  lastRead?: Record<string, any>
  // Set by the server when two people connect through a random call
  source?: 'random_call'
  chatExpiresAt?: any
  unlocked?: boolean
}
type MatchDoc = { id: string; participants: string[]; status?: string; createdAt?: any }

const toMs = (t: any): number => {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  if (t.seconds) return t.seconds * 1000
  return 0
}

function listTime(ms: number) {
  if (!ms) return ''
  const d = new Date(ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  if (now.getTime() - ms < 6 * 86400e3) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function timeLeft(ms: number) {
  const mins = Math.max(0, Math.ceil(ms / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

// Tablets get a side-by-side list and conversation; phones get one screen at a time
function useSplitView() {
  const q = '(min-width: 768px)'
  const [split, setSplit] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mql = window.matchMedia(q)
    const on = () => setSplit(mql.matches)
    mql.addEventListener?.('change', on)
    return () => mql.removeEventListener?.('change', on)
  }, [])
  return split
}

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
)
const PhoneIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)
const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
)

export default function ChatPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const withUid = new URLSearchParams(location.search).get('with') || undefined
  const split = useSplitView()
  const { showAlert, showConfirm } = useDialog()

  const [threads, setThreads] = useState<ThreadDoc[]>([])
  const [threadsLoaded, setThreadsLoaded] = useState(false)
  const [matches, setMatches] = useState<MatchDoc[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})
  const fetchedUids = useRef(new Set<string>())
  const [autoPeer, setAutoPeer] = useState<string | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [myBlockedSet, setMyBlockedSet] = useState<Set<string>>(new Set())
  const [peerBlocksMe, setPeerBlocksMe] = useState(false)
  const [peerOnline, setPeerOnline] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Which conversation is open: from the URL, or (tablet only) the most recent one
  const peerUid = withUid && withUid !== user?.uid ? withUid : (split ? autoPeer : undefined)
  const selectedId = user && peerUid ? threadIdFor(user.uid, peerUid) : undefined

  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 2000)
    return () => window.clearInterval(i)
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'threads'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as any) })))
      setThreadsLoaded(true)
    }, () => setThreadsLoaded(true))
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid))
    return onSnapshot(q, (snap) => {
      const ms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setMatches(ms.filter((m) => (m.status ?? 'confirmed') === 'confirmed'))
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeBlockedUids(user.uid, setMyBlockedSet)
  }, [user])

  useEffect(() => {
    if (!user || !peerUid) return
    setPeerBlocksMe(false)
    return subscribeAmIBlockedBy(peerUid, user.uid, setPeerBlocksMe)
  }, [user, peerUid])

  // Load profiles of everyone we chat with (only ones we don't have yet)
  useEffect(() => {
    if (!user) return
    const want = new Set<string>()
    matches.forEach((m) => { const p = m.participants?.find((x) => x !== user.uid); if (p) want.add(p) })
    threads.forEach((t) => { const p = t.participants?.find((x) => x !== user.uid); if (p) want.add(p) })
    if (peerUid) want.add(peerUid)
    const missing = [...want].filter((u) => !fetchedUids.current.has(u))
    if (!missing.length) return
    missing.forEach((u) => fetchedUids.current.add(u))
    Promise.all(missing.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid)).catch(() => null)
      return snap?.exists() ? ({ uid, ...(snap.data() as any) } as UserDoc) : undefined
    })).then((docs) => {
      setUsers((prev) => {
        const next = { ...prev }
        docs.forEach((d) => { if (d) next[d.uid] = d })
        return next
      })
    })
  }, [user, matches, threads, peerUid])

  // Self-healing: a thread with messages but no lastMessage gets it filled in
  useEffect(() => {
    if (!user) return
    threads.forEach(async (t) => {
      if (t.lastMessage) return
      try {
        const snap = await getDocs(query(collection(db, 'threads', t.id, 'messages'), orderBy('createdAt', 'desc'), limit(1)))
        if (snap.empty) return
        const last = snap.docs[0].data()
        await updateDoc(doc(db, 'threads', t.id), {
          lastMessage: { text: last.type === 'audio' ? '🎤 Voice message' : last.text, senderUid: last.senderUid, at: last.createdAt },
          updatedAt: last.createdAt,
        })
      } catch { }
    })
  }, [user, threads])

  const list: ChatListItem[] = useMemo(() => {
    if (!user) return []
    const byId = new Map<string, { peerUid: string; t?: ThreadDoc; fallbackMs: number }>()
    matches.forEach((m) => {
      const p = m.participants.find((x) => x !== user.uid)
      if (!p) return
      const tid = threadIdFor(user.uid, p)
      if (!byId.has(tid)) byId.set(tid, { peerUid: p, t: threads.find((x) => x.id === tid), fallbackMs: toMs(m.createdAt) })
    })
    threads.forEach((t) => {
      if (t.source !== 'random_call' || byId.has(t.id)) return
      const p = t.participants?.find((x) => x !== user.uid)
      if (p) byId.set(t.id, { peerUid: p, t, fallbackMs: toMs(t.createdAt) })
    })

    return [...byId.entries()]
      .map(([threadId, { peerUid: p, t, fallbackMs }]) => {
        const ms = toMs(t?.updatedAt) || toMs(t?.createdAt) || fallbackMs
        const last = t?.lastMessage
        const lastMs = toMs(last?.at) || toMs(t?.updatedAt)
        const unread = !!last && last.senderUid !== user.uid && lastMs > toMs(t?.lastRead?.[user.uid]) && threadId !== selectedId
        let tag: ChatListItem['tag']
        if (t?.source === 'random_call' && !t.unlocked && t.chatExpiresAt) {
          const left = toMs(t.chatExpiresAt) - now
          tag = left > 0 ? { text: `${timeLeft(left)} left` } : { text: 'Chat ended', ended: true }
        }
        return {
          threadId,
          peerUid: p,
          name: users[p]?.name || 'DateU user',
          photoUrl: users[p]?.photoUrl,
          lastText: last?.text || (t?.source === 'random_call' ? '📞 You connected on a random call' : ''),
          lastFromMe: last?.senderUid === user.uid,
          time: listTime(ms),
          unread,
          active: threadId === selectedId,
          tag,
          _ms: ms,
        }
      })
      .sort((a, b) => b._ms - a._ms)
      .map(({ _ms, ...rest }) => rest)
  }, [matches, threads, users, user, selectedId, now])

  // Tablet: open the most recent conversation by default
  useEffect(() => {
    if (split && !withUid && !autoPeer && list.length) setAutoPeer(list[0].peerUid)
  }, [split, withUid, autoPeer, list])

  // Opening a conversation from a link (e.g. "Start chat" on Matches)
  useEffect(() => {
    if (!user || !withUid || withUid === user.uid) return
    ensureThread(user.uid, withUid).catch(() => { })
  }, [user, withUid])

  useEffect(() => {
    setMessages([])
    setPendingMessages([])
    setReplyTo(null)
    setEditingMessage(null)
    setShowMenu(false)
    if (!selectedId) return
    const q = query(collection(db, 'threads', selectedId, 'messages'), orderBy('createdAtMs', 'asc'))
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    }, () => { })
  }, [selectedId])

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedId), [threads, selectedId])
  const selectedPeer: UserDoc | undefined = peerUid ? users[peerUid] : undefined

  useEffect(() => {
    setPeerOnline(false)
    if (!peerUid) return
    try {
      return onValue(dbRef(rtdb, `/status/${peerUid}`), (snap) => setPeerOnline(snap.val()?.state === 'online'), () => { })
    } catch {
      return undefined
    }
  }, [peerUid])

  // Mark as read while the conversation is open and visible (only once the
  // thread exists, so this never races with creating it)
  const threadExists = !!selectedThread
  useEffect(() => {
    if (!selectedId || !user || !threadExists || document.visibilityState !== 'visible') return
    markThreadAsRead(selectedId, user.uid).catch(() => { })
  }, [selectedId, user, threadExists, messages.length])

  const tsMs = (v: any) => toMs(v)
  const peerTyping = !!(selectedThread?.typing && peerUid && now - tsMs(selectedThread.typing[peerUid]) < 5000)
  const peerLastReadMs = peerUid ? tsMs(selectedThread?.lastRead?.[peerUid]) || undefined : undefined

  const iAmBlocked = peerBlocksMe || (!!peerUid && selectedThread?.blocks?.[peerUid] === true)
  const iBlockedThem = !!peerUid && myBlockedSet.has(peerUid)
  const chatExpiresMs = selectedThread?.source === 'random_call' && !selectedThread.unlocked ? tsMs(selectedThread.chatExpiresAt) || undefined : undefined
  const chatLocked = chatExpiresMs !== undefined && now >= chatExpiresMs
  const isBanned = !!profile?.banned
  const chatDisabled = iAmBlocked || iBlockedThem || chatLocked || isBanned
  const disabledReason = isBanned
    ? 'Your account can’t send messages right now. Contact support if you think this is a mistake.'
    : iBlockedThem ? 'You blocked this person. Unblock them from the ⋮ menu to message again.'
      : iAmBlocked ? 'You can’t reply to this conversation.'
        : chatLocked ? 'Your free chat time has ended. Get Premium to keep chatting.' : undefined

  const displayMessages = useMemo(() => {
    const visible = messages.filter((m) => !myBlockedSet.has(m.senderUid))
    const stillPending = pendingMessages.filter((p) => !visible.some((m) =>
      m.senderUid === p.senderUid
      && Math.abs((m.createdAtMs || 0) - (p.createdAtMs || 0)) < 8000
      && (p.type === 'audio' ? m.type === 'audio' : m.text === p.text)))
    return [...visible, ...stillPending]
  }, [messages, pendingMessages, myBlockedSet])

  const onSend = async (text: string, audio?: { url: string; duration: number }) => {
    if (!user || !selectedId || chatDisabled) return
    const reply = replyTo ? { id: replyTo.id, text: replyTo.text, senderUid: replyTo.senderUid, type: replyTo.type } : undefined
    const tempId = 'temp-' + Date.now()
    setPendingMessages((prev) => [...prev, {
      id: tempId, text: audio ? '🎤 Voice message' : text, senderUid: user.uid, createdAtMs: Date.now(), pending: true,
      type: audio ? 'audio' : 'text', audioUrl: audio?.url, mediaDuration: audio?.duration, replyTo: reply,
    }])
    setReplyTo(null)
    try {
      await sendMessage(selectedId, user.uid, text, audio ? 'audio' : 'text',
        audio ? { audioUrl: audio.url, mediaDuration: audio.duration } : undefined, reply)
    } catch {
      await showAlert('Your message couldn’t be sent. Check your connection and try again.')
    } finally {
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  const openChat = useCallback((p: string) => {
    if (!user) return
    ensureThread(user.uid, p).catch(() => { })
    // On phones this is a new screen, so the back button returns to the list
    nav(`/dashboard/chat?with=${encodeURIComponent(p)}`, { replace: split, state: { fromList: true } })
  }, [nav, user, split])

  const backToList = () => {
    if ((location.state as any)?.fromList) nav(-1)
    else nav('/dashboard/chat', { replace: true })
  }

  const handleTyping = useCallback((typing: boolean) => {
    if (!user || !selectedId) return
    setTypingStatus(selectedId, user.uid, typing).catch(() => { })
  }, [user, selectedId])

  const handleDelete = async (msgId: string) => {
    if (!selectedId) return
    if (!(await showConfirm('Delete this message for everyone?'))) return
    try {
      const mod = await import('../../../services/chat')
      await mod.deleteMessage(selectedId, msgId)
    } catch {
      await showAlert('Couldn’t delete the message. Please try again.')
    }
  }

  const onEditConfirm = async (id: string, newText: string) => {
    if (!selectedId) return
    setEditingMessage(null)
    try {
      const mod = await import('../../../services/chat')
      await mod.editMessage(selectedId, id, newText)
    } catch {
      await showAlert('Couldn’t edit the message. Please try again.')
    }
  }

  const handleLike = async (msgId: string, likes: string[]) => {
    if (!user || !selectedId) return
    await toggleLikeMessage(selectedId, msgId, user.uid, likes).catch(() => { })
  }

  const handleUnlock = async () => {
    if (!selectedId) return
    setUnlocking(true)
    try {
      await unlockRandomChat(selectedId)
    } catch (e: any) {
      if (e?.details?.reason === 'premium') nav(profile?.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium')
      else await showAlert('Couldn’t unlock this chat. Please try again.')
    } finally {
      setUnlocking(false)
    }
  }

  const toggleBlock = async () => {
    if (!user || !peerUid) return
    setShowMenu(false)
    if (iBlockedThem) {
      await unblockUser(user.uid, peerUid)
    } else if (await showConfirm(`Block ${selectedPeer?.name?.split(' ')[0] || 'this person'}? They won’t be able to message or call you.`)) {
      await blockUser(user.uid, peerUid)
    }
  }

  if (!user) return null
  const roundsPath = profile?.gender === 'male' ? '/dashboard/male/rounds' : '/dashboard/round'
  const interactive = !iAmBlocked && !iBlockedThem

  const subtitle = peerTyping
    ? <span className="dm-head-sub typing">typing…</span>
    : peerOnline
      ? <span className="dm-head-sub online">Online</span>
      : <span className="dm-head-sub">{selectedPeer?.college || (selectedPeer?.instagramId ? `@${selectedPeer.instagramId}` : 'Tap for profile')}</span>

  const conversation = selectedId && (
    <div className="dm-convo">
      <header className="dm-head">
        {!split && (
          <button type="button" className="dm-icon-btn" onClick={backToList} aria-label="Back to chats"><BackIcon /></button>
        )}
        <button type="button" className="dm-head-peer" onClick={() => !iAmBlocked && selectedPeer && setShowProfile(true)}>
          <Avatar name={selectedPeer?.name} photoUrl={selectedPeer?.photoUrl} online={peerOnline} size="sm" />
          <span className="dm-head-text">
            <span className="dm-head-name">{selectedPeer?.name || ' '}</span>
            {subtitle}
          </span>
        </button>
        {!chatDisabled && (
          <button type="button" className="dm-icon-btn" aria-label="Voice call"
            onClick={() => nav(`/dashboard/random-call?with=${encodeURIComponent(peerUid!)}`)}>
            <PhoneIcon />
          </button>
        )}
        <button type="button" className="dm-icon-btn" aria-label="More options" onClick={() => setShowMenu(true)}><MoreIcon /></button>
      </header>

      {chatExpiresMs !== undefined && !chatDisabled && (
        <div className="dm-banner">
          <span>📞 You met on a random call. Free chat ends in <strong>{timeLeft(chatExpiresMs - now)}</strong>.</span>
        </div>
      )}
      {chatLocked && !isBanned && (
        <div className="dm-banner warn">
          <span>⏳ Free chat time has ended.</span>
          <button type="button" className="dm-pill-btn" onClick={handleUnlock} disabled={unlocking}>
            {unlocking ? 'Checking…' : 'Unlock with Premium'}
          </button>
        </div>
      )}

      <ChatWindow
        key={selectedId}
        currentUid={user.uid}
        messages={displayMessages}
        onSend={onSend}
        disabled={chatDisabled}
        disabledReason={disabledReason}
        peerTyping={peerTyping}
        onTyping={handleTyping}
        peerLastReadMs={peerLastReadMs}
        peer={selectedPeer}
        intro={selectedThread?.source === 'random_call' ? 'You connected on a random call.' : 'You matched in a DateU round.'}
        onLike={interactive ? handleLike : undefined}
        onReply={interactive && !chatDisabled ? (m) => { setEditingMessage(null); setReplyTo(m) } : undefined}
        onDelete={interactive ? handleDelete : undefined}
        onEdit={interactive && !chatDisabled ? (m) => { setReplyTo(null); setEditingMessage({ id: m.id, text: m.text }) } : undefined}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onEditConfirm={onEditConfirm}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </div>
  )

  const overlays = (
    <>
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={selectedPeer} />
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={async (reason) => {
          if (!peerUid || !selectedId) return
          await reportUser({ reporterUid: user.uid, reportedUid: peerUid, threadId: selectedId, reason })
        }}
      />
      {showMenu && (
        <div className="dm dm-sheet-backdrop" onClick={() => setShowMenu(false)}>
          <div className="dm-sheet" role="menu" onClick={(e) => e.stopPropagation()}>
            <div className="dm-sheet-handle" />
            {selectedPeer && !iAmBlocked && (
              <button type="button" onClick={() => { setShowMenu(false); setShowProfile(true) }}>View profile</button>
            )}
            {!chatDisabled && peerUid && (
              <button type="button" onClick={() => { setShowMenu(false); nav(`/dashboard/random-call?with=${encodeURIComponent(peerUid)}`) }}>Voice call</button>
            )}
            <button type="button" onClick={() => { setShowMenu(false); setShowReport(true) }}>Report</button>
            <button type="button" className={iBlockedThem ? '' : 'danger'} onClick={toggleBlock}>{iBlockedThem ? 'Unblock' : 'Block'}</button>
            <button type="button" className="cancel" onClick={() => setShowMenu(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )

  const chatList = (
    <ChatList items={list} onSelect={openChat} roundsPath={roundsPath} loading={!threadsLoaded} />
  )

  // Phones: the conversation is its own full screen
  if (!split && selectedId) {
    return (
      <div className="dm dm-screen">
        {conversation}
        {overlays}
      </div>
    )
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container chat-page dm">
        <div className={`dm-page ${split ? 'split' : ''}`}>
          <div className="dm-page-list">{chatList}</div>
          {split && (
            <div className="dm-page-main">
              {conversation || (
                <div className="dm-page-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
                  {list.length ? 'Pick a chat to start messaging' : 'Your conversations will appear here'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {overlays}
    </>
  )
}
