import React, { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

type M = { id: string; text: string; senderUid: string; createdAt?: any }

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

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="chat-window">
      <div className="messages" ref={scrollerRef}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            text={m.text}
            mine={m.senderUid === currentUid}
            time={m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
          />
        ))}
      </div>
      {React.createElement(require('./MessageInput').default, { onSend })}
    </div>
  )
}