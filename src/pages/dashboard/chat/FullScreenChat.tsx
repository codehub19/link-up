import React from 'react'
import ChatWindow from '../../../components/chat/ChatWindow'
import '../../../styles/chat.css'


export default function FullScreenChat<M extends {
  id: string;
  text: string;
  senderUid: string;
  audioUrl?: string;
  likes?: string[];
  replyTo?: any
}>({
  currentUid,
  messages,
  onSend,
  header,
  disabled,
  peerTyping,
  onTyping,
  peerLastReadMs,
  onLike,
  onReply,
  replyTo,
  onCancelReply
}: {
  currentUid: string
  messages: M[]
  onSend: (text: string, audio?: { url: string, duration: number }) => Promise<void> | void
  header: React.ReactNode
  disabled?: boolean
  peerTyping?: boolean
  onTyping?: (isTyping: boolean) => void
  peerLastReadMs?: number
  onLike?: (msgId: string, currentLikes: string[]) => void
  onReply?: (msg: M) => void
  replyTo?: M | null
  onCancelReply?: () => void
}) {
  return (
    <div className="fullscreen-chat-root">
      <div className="fullscreen-chat-header">
        {header}
      </div>
      <div className="fullscreen-chat-window">
        <ChatWindow
          currentUid={currentUid}
          messages={messages as any}
          onSend={onSend}
          disabled={disabled}
          peerTyping={peerTyping}
          onTyping={onTyping}
          peerLastReadMs={peerLastReadMs}
          onLike={onLike}
          onReply={onReply as any}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
        />
      </div>
    </div>
  )
}