import React, { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

type M = { id: string; text: string; senderUid: string; createdAt?: any; createdAtMs?: number }

export default function ChatWindow({
  currentUid,
  messages = [],
  onSend,
}: {
  currentUid: string
  messages?: M[]
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
        {(messages || []).map((m) => {
          const date =
            m.createdAt?.toDate ? new Date(m.createdAt.toDate()) :
            (typeof m.createdAtMs === 'number' ? new Date(m.createdAtMs) : undefined)
          const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
          return (
            <MessageBubble key={m.id} text={m.text} mine={m.senderUid === currentUid} time={time} />
          )
        })}
      </div>
      <div className="composer-wrap">
        <MessageInput onSend={onSend} />
      </div>
    </div>
  )
}