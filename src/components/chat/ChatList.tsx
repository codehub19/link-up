import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export type ChatListItem = {
  threadId: string
  peerUid: string
  name: string
  photoUrl?: string
  lastText?: string
  lastFromMe?: boolean
  time?: string
  unread?: boolean
  active?: boolean
  /** e.g. "18h left" for random-call chats, or "Chat ended" */
  tag?: { text: string; ended?: boolean }
}

export function Avatar({ name, photoUrl, online, size }: { name?: string; photoUrl?: string; online?: boolean; size?: 'sm' }) {
  return (
    <div className={`dm-avatar ${size || ''}`}>
      {photoUrl
        ? <img src={photoUrl} alt="" loading="lazy" />
        : <div className="dm-avatar-fallback">{(name || '?').trim().charAt(0).toUpperCase()}</div>}
      {online && <span className="dm-online" aria-label="Online" />}
    </div>
  )
}

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

/** Native-style conversation list with search and unread state. */
export default function ChatList({
  items,
  onSelect,
  roundsPath,
  loading,
}: {
  items: ChatListItem[]
  onSelect: (peerUid: string) => void
  roundsPath: string
  loading?: boolean
}) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? items.filter((i) => i.name.toLowerCase().includes(s)) : items
  }, [items, q])

  return (
    <div className="dm-list">
      <div className="dm-list-head">
        <h1 className="dm-list-title">Chats</h1>
        {items.length > 0 && (
          <label className="dm-search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search chats"
              enterKeyHint="search"
            />
          </label>
        )}
      </div>

      {items.length === 0 ? (
        loading ? null : (
          <div className="dm-list-empty">
            <div className="dm-list-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>No chats yet</h3>
            <p>When you match in a round, or you both like each other after a random call, your chat shows up here.</p>
            <div className="dm-list-empty-actions">
              <Link className="dm-pill-btn" to={roundsPath}>Go to Rounds</Link>
              <Link className="dm-pill-btn ghost" to="/dashboard/random-call">Random call</Link>
            </div>
          </div>
        )
      ) : (
        <div className="dm-rows" role="list">
          {shown.map((t) => (
            <button
              key={t.threadId}
              type="button"
              role="listitem"
              className={`dm-row ${t.active ? 'active' : ''} ${t.unread ? 'unread' : ''}`}
              onClick={() => onSelect(t.peerUid)}
            >
              <Avatar name={t.name} photoUrl={t.photoUrl} />
              <div className="dm-row-body">
                <div className="dm-row-top">
                  <span className="dm-row-name">{t.name}</span>
                  {t.time && <span className="dm-row-time">{t.time}</span>}
                </div>
                <div className="dm-row-bottom">
                  <span className="dm-row-last">
                    {t.lastText ? `${t.lastFromMe ? 'You: ' : ''}${t.lastText}` : 'Say hi 👋'}
                  </span>
                  {t.tag && <span className={`dm-tag ${t.tag.ended ? 'ended' : ''}`}>{t.tag.text}</span>}
                  {t.unread && <span className="dm-unread-dot" aria-label="Unread" />}
                </div>
              </div>
            </button>
          ))}
          {shown.length === 0 && <div className="dm-list-empty"><p>No chats match “{q}”.</p></div>}
        </div>
      )}
    </div>
  )
}
