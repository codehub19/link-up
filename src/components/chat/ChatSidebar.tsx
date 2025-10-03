import React from 'react'

type Item = {
  id: string
  peerUid: string
  name: string
  photoUrl?: string
  instagramId?: string
  lastText?: string
  active?: boolean
  sortTime?: number
}

type User = { uid: string; name?: string; photoUrl?: string; instagramId?: string }

export default function ChatSidebar({
  items = [],
  onSelect,
  users = {},
  currentUid,
}: {
  items?: Item[]
  onSelect: (idOrPeerUid: string) => void
  users?: Record<string, User>
  currentUid: string
}) {
  const safe = Array.isArray(items) ? items : []
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-title">Chats</div>
      <div className="thread-list">
        {safe.map((t) => (
          <button
            key={t.id}
            className={`thread-item ${t.active ? 'active' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <div className="avatar">
              {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <div className="avatar-fallback">{(t.name || 'U').slice(0,1)}</div>}
            </div>
            <div className="meta">
              <div className="name">{t.name}</div>
              <div className="last" title={t.lastText || ''}>{t.lastText || 'Say hi 👋'}</div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}