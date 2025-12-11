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
  peerAvatar,
  onTyping,
  peerLastReadMs,
  onLike,
  onReply,
  onDelete, // Add onDelete
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
  header: React.ReactNode
  disabled?: boolean
  peerTyping?: boolean
  peerAvatar?: string
  onTyping?: (isTyping: boolean) => void
  peerLastReadMs?: number
  onLike?: (msgId: string, currentLikes: string[]) => void
  onReply?: (msg: M) => void
  onDelete?: (msgId: string) => void // Add type
  onEdit?: (msg: M) => void
  replyTo?: M | null
  onCancelReply?: () => void
  editingMessage?: { id: string, text: string } | null
  onEditConfirm?: (id: string, newText: string) => void
  onCancelEdit?: () => void
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
          peerAvatar={peerAvatar}
          onTyping={onTyping}
          peerLastReadMs={peerLastReadMs}
          onLike={onLike}
          onReply={onReply as any}
          onDelete={onDelete}
          onEdit={onEdit as any}
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