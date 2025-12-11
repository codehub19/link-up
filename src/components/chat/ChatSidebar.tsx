import React from 'react'

export default function ChatSidebar({
  items,
  onSelect,
}: {
  items: Array<{
    id: string
    peerUid: string
    name: string
    photoUrl?: string
    instagramId?: string
    lastText?: string
    active?: boolean
    time?: string
  }>
  onSelect: (peerUid: string) => void
}) {
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-title">Chats</div>
      <div className="thread-list">
        {items.map((t) => (
          <button
            key={t.id || t.peerUid}
            className={`thread-item ${t.active ? 'active' : ''}`}
            onClick={() => onSelect(t.peerUid)}
          >
            <div className="avatar">
              {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <div className="avatar-fallback">{(t.name || 'U').slice(0, 1)}</div>}
            </div>
            <div className="meta">
              <div className="row-top">
                <div className="name">{t.name}</div>
                {t.time && <div className="time">{t.time}</div>}
              </div>
              <div className="last" title={t.lastText || ''}>{t.lastText || 'Say hi 👋'}</div>
            </div>
          </button>
        ))}
      </div>
      <style>{`
        .row-top {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
        }
        .time {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.4);
            white-space: nowrap;
            margin-left: 8px;
        }
      `}</style>
    </aside>
  )
}