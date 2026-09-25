import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { Avatar } from './ChatList'

export type ChatMessage = {
  id: string
  text: string
  senderUid: string
  createdAt?: any
  createdAtMs?: number
  audioUrl?: string
  audioDuration?: number
  mediaDuration?: number
  type?: 'text' | 'audio'
  likes?: string[]
  isEdited?: boolean
  pending?: boolean
  replyTo?: { id: string; text: string; senderUid: string; type?: 'text' | 'audio' }
}

// Messages can be edited or deleted for 30 minutes after sending
const MODIFY_WINDOW_MS = 30 * 60 * 1000
// Messages from the same person within this gap are grouped together
const GROUP_GAP_MS = 5 * 60 * 1000

const msOf = (m: ChatMessage) =>
  typeof m.createdAtMs === 'number' ? m.createdAtMs : (m.createdAt?.toMillis ? m.createdAt.toMillis() : 0)

function dayLabel(ms: number) {
  const d = new Date(ms)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString([], { weekday: sameYear ? 'short' : undefined, day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
}

const timeLabel = (ms: number) => (ms ? new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined)

export default function ChatWindow({
  currentUid,
  messages,
  onSend,
  disabled,
  disabledReason,
  peerTyping,
  onTyping,
  peerLastReadMs,
  peer,
  intro,
  onLike,
  onReply,
  onDelete,
  onEdit,
  replyTo,
  onCancelReply,
  editingMessage,
  onEditConfirm,
  onCancelEdit,
}: {
  currentUid: string
  messages: ChatMessage[]
  onSend: (text: string, audio?: { url: string; duration: number }) => Promise<void> | void
  disabled?: boolean
  disabledReason?: string
  peerTyping?: boolean
  onTyping?: (isTyping: boolean) => void
  peerLastReadMs?: number
  peer?: { name?: string; photoUrl?: string }
  /** Shown above the first message, e.g. how you matched */
  intro?: string
  onLike?: (msgId: string, currentLikes: string[]) => void
  onReply?: (msg: ChatMessage) => void
  onDelete?: (msgId: string) => void
  onEdit?: (msg: ChatMessage) => void
  replyTo?: ChatMessage | null
  onCancelReply?: () => void
  editingMessage?: { id: string; text: string } | null
  onEditConfirm?: (id: string, newText: string) => void
  onCancelEdit?: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const didInitialScroll = useRef(false)
  const lastCount = useRef(0)
  const [showJump, setShowJump] = useState(false)
  const peerFirst = (peer?.name || '').split(' ')[0] || 'Them'

  const scrollToBottom = (smooth: boolean) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Open at the latest message instantly; afterwards follow new messages only
  // if you're already at the bottom (or you sent it).
  useLayoutEffect(() => {
    const count = messages.length
    if (!didInitialScroll.current) {
      if (count > 0) {
        scrollToBottom(false)
        didInitialScroll.current = true
      }
    } else if (count > lastCount.current) {
      const newest = messages[count - 1]
      if (atBottomRef.current || newest?.senderUid === currentUid) scrollToBottom(true)
    }
    lastCount.current = count
  }, [messages, currentUid])

  useEffect(() => {
    if (peerTyping && atBottomRef.current) scrollToBottom(true)
  }, [peerTyping])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60
      atBottomRef.current = near
      setShowJump(!near)
    }
    // Keep the latest message visible when the keyboard opens/closes
    const ro = new ResizeObserver(() => { if (atBottomRef.current) scrollToBottom(false) })
    ro.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const rows = useMemo(() => {
    const out: React.ReactNode[] = []
    let prevDay = ''
    const now = Date.now()
    messages.forEach((m, i) => {
      const ms = msOf(m)
      const day = ms ? new Date(ms).toDateString() : prevDay
      if (day && day !== prevDay) {
        out.push(<div key={'d' + day} className="dm-day">{dayLabel(ms)}</div>)
      }
      const prev = messages[i - 1]
      const next = messages[i + 1]
      const sameAsPrev = prev && prev.senderUid === m.senderUid && day === prevDay && ms - msOf(prev) < GROUP_GAP_MS
      const nextDay = next ? new Date(msOf(next) || ms).toDateString() : ''
      const sameAsNext = next && next.senderUid === m.senderUid && nextDay === day && msOf(next) - ms < GROUP_GAP_MS
      prevDay = day

      const mine = m.senderUid === currentUid
      const canModify = mine && !m.pending && !!ms && now - ms < MODIFY_WINDOW_MS
      const isAudio = !!m.audioUrl || m.type === 'audio'
      out.push(
        <MessageBubble
          key={m.id}
          text={m.text}
          mine={mine}
          first={!sameAsPrev}
          last={!sameAsNext}
          time={timeLabel(ms)}
          audioUrl={m.audioUrl}
          audioDuration={m.mediaDuration ?? m.audioDuration}
          pending={m.pending}
          isRead={!!peerLastReadMs && !!ms && ms <= peerLastReadMs}
          likedByMe={m.likes?.includes(currentUid)}
          likesCount={m.likes?.length || 0}
          onLike={onLike && !m.pending ? () => onLike(m.id, m.likes || []) : undefined}
          replyTo={m.replyTo}
          replyWho={m.replyTo ? (m.replyTo.senderUid === currentUid ? 'You' : peerFirst) : undefined}
          onReply={onReply && !m.pending ? () => onReply(m) : undefined}
          onDelete={onDelete && canModify ? () => onDelete(m.id) : undefined}
          onEdit={onEdit && canModify && !isAudio && m.text ? () => onEdit(m) : undefined}
          isEdited={m.isEdited}
        />,
      )
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUid, peerLastReadMs, peerFirst, !!onLike, !!onReply, !!onDelete, !!onEdit])

  return (
    <div className="dm-window">
      <div className="dm-messages" ref={scrollerRef}>
        <div className="dm-messages-spacer" />
        {(
          <div className="dm-intro">
            <Avatar name={peer?.name} photoUrl={peer?.photoUrl} />
            <strong>{peer?.name || 'Chat'}</strong>
            {intro || 'Say hi and start the conversation 👋'}
          </div>
        )}
        {rows}
        {peerTyping && (
          <div className="dm-typing" aria-label={`${peerFirst} is typing`}>
            <span /><span /><span />
          </div>
        )}
      </div>

      <div className="dm-composer">
        {showJump && (
          <button type="button" className="dm-jump" onClick={() => scrollToBottom(true)} aria-label="Jump to latest message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        )}
        <MessageInput
          onSend={onSend}
          disabled={disabled}
          disabledReason={disabledReason}
          currentUid={currentUid}
          peerName={peerFirst}
          onTyping={onTyping}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          editingMessage={editingMessage}
          onEditConfirm={onEditConfirm}
          onCancelEdit={onCancelEdit}
        />
      </div>
    </div>
  )
}
