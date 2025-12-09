import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

type M = { id: string; text: string; senderUid: string; createdAt?: any; createdAtMs?: number }

export default function ChatWindow({
  currentUid,
  messages,
  onSend,
}: {
  currentUid: string
  messages: M[]
  onSend: (text: string) => Promise<void> | void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const isFirstLoad = useRef(true)

  // Only auto-scroll if user is at bottom (not if they've scrolled up)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    if (isFirstLoad.current) {
      // Force instant scroll without animation
      el.style.scrollBehavior = 'auto'
      el.scrollTop = el.scrollHeight
      isFirstLoad.current = false
      return
    }

    if (!userScrolled) {
      // Smooth scroll for new messages
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, userScrolled])

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
            />
          )
        })}
        {showScrollBtn && (
          <button
            className="scroll-latest-btn"
            type="button"
            onClick={scrollToLatest}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Scroll to latest"
          >
            ↓ Latest
          </button>
        )}
      </div>
      <div className="composer-wrap">
        <MessageInput onSend={onSend} />
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
        .scroll-latest-btn {
          position: absolute;
          right: 20px;
          bottom: 90px;
          z-index: 10;
          background: #2a2a35;
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.9rem;
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
          .composer-wrap {
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}