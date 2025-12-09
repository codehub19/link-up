import React from 'react'
import ChatWindow from '../../../components/chat/ChatWindow'
import '../../../styles/chat.css'


export default function FullScreenChat({
  currentUid,
  messages,
  onSend,
  header,
  disabled
}: {
  currentUid: string
  messages: any[]
  onSend: (text: string) => Promise<void> | void
  header: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="fullscreen-chat-root">
      <div className="fullscreen-chat-header">
        {header}
      </div>
      <div className="fullscreen-chat-window">
        <ChatWindow
          currentUid={currentUid}
          messages={messages}
          onSend={onSend}
          disabled={disabled}
        />
      </div>
    </div>
  )
}