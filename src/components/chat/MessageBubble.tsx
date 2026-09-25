import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import AudioPlayer from './AudioPlayer'

const ReplyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
)

const Tick = ({ read, pending }: { read?: boolean; pending?: boolean }) => {
  if (pending) {
    return (
      <span className="dm-tick" aria-label="Sending">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </span>
    )
  }
  return (
    <span className={`dm-tick ${read ? 'read' : ''}`} aria-label={read ? 'Seen' : 'Sent'}>
      <svg width={read ? 17 : 13} height="12" viewBox={read ? '0 0 30 24' : '0 0 24 24'} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
        {read && <polyline points="27 6 16 17" />}
      </svg>
    </span>
  )
}

export default function MessageBubble({
  text, mine, time, audioUrl, audioDuration, isRead, pending, likedByMe, likesCount = 0,
  onLike, replyTo, replyWho, onReply, onDelete, onEdit, isEdited, first, last,
}: {
  text: string
  mine: boolean
  time?: string
  audioUrl?: string
  audioDuration?: number
  isRead?: boolean
  pending?: boolean
  likedByMe?: boolean
  likesCount?: number
  onLike?: () => void
  replyTo?: { id: string; text: string; senderUid: string; type?: 'text' | 'audio' }
  /** "You" or the other person's first name */
  replyWho?: string
  onReply?: () => void
  onDelete?: () => void
  onEdit?: () => void
  isEdited?: boolean
  first?: boolean
  last?: boolean
}) {
  const [heartPop, setHeartPop] = useState(false)
  const [liked, setLiked] = useState(!!likedByMe)
  const [menuOpen, setMenuOpen] = useState(false)
  const pressTimer = useRef<number>()
  const lastTap = useRef(0)
  const moved = useRef(false)

  const controls = useAnimation()
  const x = useMotionValue(0)
  const swipeOpacity = useTransform(x, [0, 50], [0, 1])
  const swipeScale = useTransform(x, [0, 50], [0.6, 1])

  useEffect(() => { setLiked(!!likedByMe) }, [likedByMe])
  useEffect(() => () => window.clearTimeout(pressTimer.current), [])

  const like = () => {
    if (!onLike || pending) return
    if (!liked) {
      setLiked(true)
      onLike()
    }
    setHeartPop(true)
    window.setTimeout(() => setHeartPop(false), 700)
  }

  const onPointerDown = () => {
    moved.current = false
    window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => {
      if (moved.current || pending) return
      navigator.vibrate?.(30)
      setMenuOpen(true)
    }, 450)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    window.clearTimeout(pressTimer.current)
    if (moved.current) return
    // Taps on the voice-note controls aren't likes
    if ((e.target as HTMLElement).closest('button, input')) return
    // Double-tap to like (works on touch, where dblclick is unreliable)
    const now = Date.now()
    if (now - lastTap.current < 300) {
      lastTap.current = 0
      like()
    } else {
      lastTap.current = now
    }
  }

  const onPan = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 6 || Math.abs(info.offset.y) > 6) {
      moved.current = true
      window.clearTimeout(pressTimer.current)
    }
    if (!onReply) return
    if (info.offset.x > 0) x.set(Math.min(info.offset.x * 0.45, 64))
  }

  const onPanEnd = () => {
    if (onReply && x.get() > 40) {
      navigator.vibrate?.(15)
      onReply()
    }
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 32 } })
  }

  const copy = async () => {
    setMenuOpen(false)
    try { await navigator.clipboard.writeText(text) } catch { }
  }

  const showLike = likesCount > 0 || liked

  return (
    <div className={`dm-msg ${mine ? 'mine' : 'theirs'} ${first ? 'first' : ''} ${last ? 'last' : ''} ${pending ? 'pending' : ''} ${showLike ? 'liked' : ''}`}>
      <div className="dm-msg-wrap">
        {onReply && (
          <motion.div className="dm-swipe" style={{ opacity: swipeOpacity, scale: swipeScale }}>
            <ReplyIcon />
          </motion.div>
        )}

        <motion.div
          className="dm-bubble"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => window.clearTimeout(pressTimer.current)}
          onContextMenu={(e) => { e.preventDefault(); if (!pending) setMenuOpen(true) }}
          onPan={onPan}
          onPanEnd={onPanEnd}
          animate={controls}
          style={{ x }}
        >
          {replyTo && (
            <div className="dm-quote">
              <div className="dm-quote-bar" />
              <div className="dm-quote-body">
                <div className="dm-quote-who">{replyWho || 'Reply'}</div>
                <div className="dm-quote-text">{replyTo.type === 'audio' ? '🎤 Voice message' : replyTo.text}</div>
              </div>
            </div>
          )}

          {audioUrl ? (
            <AudioPlayer src={audioUrl} mine={mine} duration={audioDuration} />
          ) : (
            <span className="dm-text">{text}</span>
          )}

          {time && (
            <span className="dm-meta">
              {isEdited && <span className="dm-edited">edited</span>}
              <span>{time}</span>
              {mine && <Tick read={isRead} pending={pending} />}
            </span>
          )}

          {showLike && <span className="dm-like" aria-label="Liked">❤️</span>}
          {heartPop && <span className="dm-heart-pop" aria-hidden="true">❤️</span>}
        </motion.div>
      </div>

      {menuOpen && createPortal(
        <div className="dm dm-sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="dm-sheet" onClick={(e) => e.stopPropagation()} role="menu">
            <div className="dm-sheet-handle" />
            <div className="dm-sheet-preview">{audioUrl ? '🎤 Voice message' : text}</div>
            {onLike && !liked && (
              <button type="button" onClick={() => { setMenuOpen(false); like() }}>
                <span aria-hidden="true">❤️</span> Like
              </button>
            )}
            {onReply && (
              <button type="button" onClick={() => { setMenuOpen(false); onReply() }}>
                <ReplyIcon /> Reply
              </button>
            )}
            {text && !audioUrl && (
              <button type="button" onClick={copy}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copy
              </button>
            )}
            {onEdit && (
              <button type="button" onClick={() => { setMenuOpen(false); onEdit() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="danger" onClick={() => { setMenuOpen(false); onDelete() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                Delete
              </button>
            )}
            <button type="button" className="cancel" onClick={() => setMenuOpen(false)}>Cancel</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export const MemoMessageBubble = React.memo(MessageBubble)
