import React from 'react'

export default function ChatSidebar({
  threads,
  selectedId,
  onSelect,
  users,
  currentUid,
}: {
  threads: Array<{ id: string; participants: string[]; lastMessage?: { text: string; senderUid: string } | null }>
  selectedId?: string
  onSelect: (id: string) => void
  users: Record<string, { uid: string; name?: string; photoUrl?: string; instagramId?: string }>
  currentUid: string
}) {
  return (
    <div className="chat-sidebar">
      <div className="sidebar-title">Chats</div>
      <div className="thread-list">
        {threads.map((t) => {
          const peerUid = t.participants.find((p) => p !== currentUid) || currentUid
          const u = users[peerUid]
          return (
            <button
              key={t.id}
              className={`thread-item ${selectedId === t.id ? 'active' : ''}`}
              onClick={() => onSelect(t.id)}
            >
              <div className="avatar">
                {u?.photoUrl ? <img src={u.photoUrl} alt={u?.name || 'user'} /> : <div className="avatar-fallback">{(u?.name || 'U').slice(0,1)}</div>}
              </div>
              <div className="meta">
                <div className="name">{u?.name || 'Unknown'}</div>
                <div className="last">{t.lastMessage?.text || 'Say hi 👋'}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}