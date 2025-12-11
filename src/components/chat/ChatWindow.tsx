import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

type M = {
  id: string;
  text: string;
  senderUid: string;
  createdAt?: any;
  createdAtMs?: number;
  audioUrl?: string;
  audioDuration?: number; // Add duration support
  type?: 'text' | 'audio';
  likes?: string[];
  replyTo?: {
    id: string
    text: string
    senderUid: string
    type?: 'text' | 'audio'
  }
}

export default function ChatWindow({
  currentUid,
  messages,
  onSend,
  disabled,
  peerTyping,
  onTyping,
  peerLastReadMs,
  peerAvatar, // Add peerAvatar prop
  onLike,
  onReply,
  onDelete,
  onEdit,
  replyTo,
  onCancelReply,
  editingMessage,
  onEditConfirm,
  onCancelEdit
}: {
  currentUid: string
  messages: M[]
  onSend: (text: string, audio?: { url: string, duration: number }) => Promise<void> | void
  disabled?: boolean
  peerTyping?: boolean
  onTyping?: (isTyping: boolean) => void
  peerLastReadMs?: number
  peerAvatar?: string // Add type
  onLike?: (msgId: string, currentLikes: string[]) => void
  onReply?: (msg: M) => void
  onDelete?: (msgId: string) => void
  onEdit?: (msg: M) => void
  replyTo?: M | null
  onCancelReply?: () => void
  editingMessage?: { id: string, text: string } | null
  onEditConfirm?: (id: string, newText: string) => void
  onCancelEdit?: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const isFirstLoad = useRef(true)

  // Use layout effect to scroll before paint to avoid visual jump
  React.useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    // On first load with messages, jump instantly to bottom
    // if (isFirstLoad.current && messages.length > 0) {
    //   el.style.scrollBehavior = 'auto'
    //   el.scrollTop = el.scrollHeight
    //   isFirstLoad.current = false
    //   return
    // }

    if (!userScrolled) {
      // For new messages, only smooth scroll if we are already at bottom
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, userScrolled, peerTyping])

  // Detect user scroll position and show "Go to latest" button
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
      setUserScrolled(!isNearBottom)
      setShowScrollBtn(!isNearBottom)
    }
    el.addEventListener('scroll', onScroll)
    // Initial scroll position
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll to latest message handler with smooth effect
  const scrollToLatest = () => {
    const el = scrollerRef.current
    if (!el) return
    // For older browsers, fallback to instant scroll if smooth not supported
    try {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      })
    } catch {
      el.scrollTop = el.scrollHeight
    }
    setUserScrolled(false)
    setShowScrollBtn(false)
  }

  return (
    <div className="chat-window">
      <div className="messages" ref={scrollerRef}>
        {messages.map((m) => {
          const date =
            m.createdAt?.toDate ? new Date(m.createdAt.toDate()) :
              (typeof m.createdAtMs === 'number' ? new Date(m.createdAtMs) : undefined)
          const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
          return (
            <MessageBubble
              key={m.id}
              text={m.text}
              mine={m.senderUid === currentUid}
              time={time}
              audioUrl={m.audioUrl}
              audioDuration={m.audioDuration}
              isRead={peerLastReadMs && m.createdAtMs ? m.createdAtMs <= peerLastReadMs : false}
              isLiked={m.likes?.includes(currentUid)}
              onLike={onLike ? () => onLike(m.id, m.likes || []) : undefined}
              replyTo={m.replyTo}
              onReply={() => onReply?.(m)}
              onDelete={onDelete ? () => onDelete(m.id) : undefined}
              onEdit={onEdit ? (m.text && !m.audioUrl ? () => onEdit(m) : undefined) : undefined}
              createdAtMs={m.createdAtMs} // Pass creation time for 30min check
            />
          )
        })}
        {peerTyping && (
          <div className="msg-row theirs typing-row">
            {peerAvatar ? (
              <div className="typing-avatar">
                <img src={peerAvatar} alt="typing" />
              </div>
            ) : null}
            <div className="bubble typing-bubble">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        {showScrollBtn && (
          <button
            className="scroll-latest-btn"
            type="button"
            onClick={scrollToLatest}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Scroll to latest"
          >
            ↓
          </button>
        )}
      </div>
      {replyTo && (
        <div className="reply-banner-container">
          <div className="reply-banner">
            <div className="reply-info">
              <span className="reply-label">Replying to {replyTo.senderUid === currentUid ? 'Yourself' : 'message'}</span>
              <span className="reply-text text-truncate">{replyTo.type === 'audio' ? '🎤 Audio Message' : replyTo.text}</span>
            </div>
            <button className="reply-close" onClick={onCancelReply}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="composer-wrap">
        <MessageInput
          onSend={onSend}
          disabled={disabled}
          currentUid={currentUid}
          onTyping={onTyping}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          editingMessage={editingMessage}
          onEditConfirm={onEditConfirm}
          onCancelEdit={onCancelEdit}
        />
      </div>
      <style>{`
          .chat-window {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            background: #121218;
            position: relative;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
          }
          .composer-wrap {
            padding: 0;
            background: #181821;
            border-top: 1px solid rgba(255,255,255,0.08);
          }
          .reply-banner-container {
            background: #181821;
            padding: 8px 16px 0 16px;
            border-top: 1px solid rgba(255,255,255,0.08);
          }
          .reply-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #23232f;
            padding: 8px 12px;
            border-radius: 12px;
            border-left: 3px solid #ff416c;
            animation: slideUp 0.2s ease-out;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .reply-info {
            display: flex;
            flex-direction: column;
            font-size: 0.85rem;
            overflow: hidden;
          }
          .reply-label {
            color: #ff416c;
            font-weight: 500;
            font-size: 0.75rem;
          }
          .reply-text {
            color: rgba(255,255,255,0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .reply-close {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.5);
            cursor: pointer;
            padding: 4px;
          }
          .reply-close:hover { color: white; }

          .scroll-latest-btn {
            position: absolute;
            right: 60px;
            bottom: 90px;
            z-index: 10;
            background: #2a2a35;
            color: #fff;
            padding: 8px 15px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.1);
            font-size: 1.1rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
          }
          .scroll-latest-btn:hover {
            background: #32323f;
            transform: translateY(-2px);
          }
          @media (max-width: 650px) {
            .scroll-latest-btn {
              right: 16px;
              bottom: 80px;
            }
          }
          .typing-row {
            align-items: flex-end;
            gap: 8px;
            padding-left: 16px;
          }
          .typing-avatar {
             width: 28px;
             height: 28px;
             border-radius: 50%;
             overflow: hidden;
             flex-shrink: 0;
             margin-bottom: 4px; /* Align with bottom of bubble */
             background: #2a2a35;
          }
          .typing-avatar img { width: 100%; height: 100%; object-fit: cover; }

          .typing-bubble {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 12px 16px;
            min-height: 40px;
            border-bottom-left-radius: 4px; /* Chat bubble style */
          }
          .dot {
            width: 6px;
            height: 6px;
            background: #a6a7bb;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
          }
          .dot:nth-child(1) { animation-delay: -0.32s; }
          .dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
    </div>
  )
}