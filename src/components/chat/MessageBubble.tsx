import React, { useEffect, useState } from 'react'
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import AudioPlayer from './AudioPlayer'


export default function MessageBubble({
  text, mine, time, audioUrl, audioDuration, isRead, isLiked, onLike, replyTo, onReply, onDelete, onEdit, createdAtMs
}: {
  text: string
  mine: boolean
  time?: string
  audioUrl?: string
  audioDuration?: number
  isRead?: boolean
  isLiked?: boolean
  onLike?: () => void
  replyTo?: { id: string; text: string; senderUid: string; type?: 'text' | 'audio' }
  onReply?: () => void
  onDelete?: () => void
  onEdit?: () => void
  createdAtMs?: number
}) {
  const [showAnim, setShowAnim] = useState(false)
  const [optimisticLike, setOptimisticLike] = useState(!!isLiked)
  const [showMenu, setShowMenu] = useState(false)

  const controls = useAnimation()
  const longPressTimer = React.useRef<number>()

  // Motion values for swipe
  const x = useMotionValue(0)
  const indicatorOpacity = useTransform(x, [0, 50], [0, 1])
  const indicatorScale = useTransform(x, [0, 50], [0.8, 1])

  // Sync optimistic like with prop
  useEffect(() => {
    setOptimisticLike(!!isLiked)
  }, [isLiked])

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return
    const close = () => setShowMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showMenu])

  const handleDoubleClick = () => {
    if (onLike) {
      if (!optimisticLike) {
        setOptimisticLike(true)
        onLike() // Fire and forget
      }
      setShowAnim(true)
      setTimeout(() => setShowAnim(false), 1000)
    }
  }

  const handlePointerDown = () => {
    longPressTimer.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50)
      setShowMenu(true)
    }, 500)
  }

  const handlePointerUpOrLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  // Manual Swipe Handlers
  const onPan = (event: any, info: PanInfo) => {
    handlePointerUpOrLeave() // Cancel long press on drag
    if (!onReply) return
    if (info.offset.x > 0) {
      const damped = info.offset.x * 0.4
      x.set(Math.min(damped, 60))
    }
  }

  const onPanEnd = (event: any, info: PanInfo) => {
    if (!onReply) return
    if (x.get() > 30) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20)
      }
      onReply()
    }
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } })
  }

  const copyText = () => {
    if (text) {
      navigator.clipboard.writeText(text)
    }
    setShowMenu(false)
  }

  const canDelete = mine && onDelete && createdAtMs && (Date.now() - createdAtMs < 30 * 60 * 1000)

  return (
    <div className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
      <div className="bubble-wrapper">

        {/* Swipe Reply Indicator */}
        {onReply && (
          <motion.div
            className="swipe-indicator"
            style={{ opacity: indicatorOpacity, scale: indicatorScale, x: -10 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"></polyline>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
            </svg>
          </motion.div>
        )}

        <motion.div
          layout
          className="bubble"
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onPan={onPan}
          onPanEnd={onPanEnd}
          animate={controls}
          style={{ x, touchAction: 'pan-y' }}
        >
          {/* Menu Overlay */}
          {showMenu && (
            <div className="msg-menu-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="menu-backdrop" onClick={() => setShowMenu(false)}></div>
              <div className={`msg-menu ${mine ? 'mine' : 'theirs'}`}>
                <button onClick={() => { onReply && onReply(); setShowMenu(false); }}>
                  <span>Reply</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                </button>
                {text && (
                  <button onClick={copyText}>
                    <span>Copy</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                )}
                {canDelete && onEdit && !audioUrl && (
                  <button onClick={() => { onEdit(); setShowMenu(false); }}>
                    <span>Edit</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                )}
                {canDelete && (
                  <button className="danger" onClick={() => { onDelete(); setShowMenu(false); }}>
                    <span>Delete</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {replyTo && (
            <div className={`reply-quote ${mine ? 'mine-quote' : 'theirs-quote'}`}>
              <div className="quote-bar"></div>
              <div className="quote-content">
                <div className="quote-sender">{replyTo.senderUid === (mine ? 'me' : '') ? 'You' : 'Reply'}</div>
                <div className="quote-text">{replyTo.type === 'audio' ? '🎤 Audio Message' : replyTo.text}</div>
              </div>
            </div>
          )}

          {audioUrl ? (
            <AudioPlayer src={audioUrl} mine={mine} duration={audioDuration} />
          ) : (
            <div className="text">{text}</div>
          )}
          {time && (
            <div className="time-row">
              <span className="time">{time}</span>
              {mine && (
                <span className={`read-status ${isRead ? 'read' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                    {isRead && <polyline points="15 6 9 17 4 12" style={{ transform: 'translateX(6px)' }}></polyline>}
                  </svg>
                </span>
              )}
            </div>
          )}

          {/* Like Heart (Small, static) */}
          {optimisticLike && !mine && (
            <div className="liked-heart">❤️</div>
          )}

          {/* Animation Heart (Big, dynamic) */}
          {showAnim && (
            <div className="heart-anim">❤️</div>
          )}
        </motion.div>
      </div>

      <style>{`
        .bubble-wrapper {
          position: relative;
          display: flex;
          align-items: center; /* Center align for swipe indicator */
          gap: 8px;
          max-width: 75%;
          overflow: visible; /* Ensure nothing clips */
        }
        .swipe-indicator {
          position: absolute;
          left: -30px;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .bubble {
          max-width: 100%; 
          padding: 10px 16px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          overflow-wrap: break-word;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          user-select: none;
          min-width: 60px;
          cursor: grab;
          touch-action: pan-y !important; /* Force browser to respect pan-y */
        }
        .bubble:active { cursor: grabbing; }

        .reply-quote {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 6px;
          display: flex;
          gap: 8px;
          font-size: 0.85rem;
          position: relative;
          overflow: hidden;
        }
        .mine-quote { background: rgba(0,0,0,0.15); }
        .theirs-quote { background: rgba(0,0,0,0.2); }
        .quote-bar {
          width: 3px;
          background: rgba(255,255,255,0.5);
          border-radius: 2px;
        }
        .quote-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .quote-sender {
          font-weight: 600;
          font-size: 0.75rem;
          opacity: 0.9;
        }
        .quote-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0.8;
        }

        .liked-heart {
          position: absolute;
          bottom: -6px;
          right: -6px;
          background: #1f1f28; /* Match bg to hide line if needed, or white for pop */
          background: white;
          color: #ff416c;
          border: 2px solid #121218; /* Contrast border */
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 10;
        }
        .heart-anim {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          font-size: 40px;
          animation: popHeart 0.6s ease-out forwards;
          pointer-events: none;
          z-index: 20;
        }
        @keyframes popHeart {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        .time-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
          opacity: 0.7;
        }
        .time {
          font-size: 0.65rem;
          margin-top: 0 !important;
          text-align: inherit !important;
          opacity: 1 !important;
        }
        .msg-row.theirs .time-row {
          justify-content: flex-start;
          color: #a6a7bb;
          opacity: 1;
        }
        .read-status {
          display: flex;
          align-items: center;
          color: rgba(255,255,255,0.7);
        }
        .read-status.read {
          color: #4da6ff;
        }
        
        .msg-row {
          display: flex;
          margin-bottom: 12px;
          padding: 0 16px;
        }
        .msg-row.mine {
          justify-content: flex-end;
        }
        .msg-row.theirs {
          justify-content: flex-start;
        }
        /* Adjust wrapper for alignment */
        .msg-row.mine .bubble-wrapper {
          flex-direction: row-reverse;
        }
        
        .msg-row.mine .bubble {
          background: linear-gradient(135deg, #ff416c, #ff4b2b);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .msg-row.theirs .bubble {
          background: #1f1f28;
          color: #e9e9f2;
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
        }
        .text {
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .msg-menu-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none; /* Let clicks pass through if just overlay logic, but here we want to block */
            z-index: 100;
        }
        .menu-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99;
            /* Transparent backdrop to catch clicks */
        }
        .msg-menu {
            position: absolute;
            bottom: 110%; /* Above message */
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            background: #2a2a35;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            min-width: 140px;
            z-index: 101;
            pointer-events: auto;
            animation: popIn 0.15s ease-out;
        }
        .msg-menu.mine { right: 0; left: auto; transform: none; }
        .msg-menu.theirs { left: 0; transform: none; }

        @keyframes popIn {
            from { opacity: 0; transform: scale(0.9) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .msg-menu button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .msg-menu button:last-child { border-bottom: none; }
        .msg-menu button:hover { background: rgba(255,255,255,0.1); }
        .msg-menu button.danger { color: #ff4b2b; }
        .msg-menu button.danger:hover { background: rgba(255, 75, 43, 0.1); }
      `}</style>
    </div>
  )
}