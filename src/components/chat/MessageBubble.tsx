import React, { useEffect, useState } from 'react'
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import AudioPlayer from './AudioPlayer'

export default function MessageBubble({
  text, mine, time, audioUrl, isRead, isLiked, onLike, replyTo, onReply
}: {
  text: string
  mine: boolean
  time?: string
  audioUrl?: string
  isRead?: boolean
  isLiked?: boolean
  onLike?: () => void
  replyTo?: { id: string; text: string; senderUid: string; type?: 'text' | 'audio' }
  onReply?: () => void
}) {
  const [showAnim, setShowAnim] = useState(false)
  const [optimisticLike, setOptimisticLike] = useState(!!isLiked)
  const controls = useAnimation()

  // Motion values for swipe
  const x = useMotionValue(0)
  const indicatorOpacity = useTransform(x, [0, 50], [0, 1])
  const indicatorScale = useTransform(x, [0, 50], [0.8, 1])

  // Sync optimistic like with prop
  useEffect(() => {
    setOptimisticLike(!!isLiked)
  }, [isLiked])

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

  // Manual Swipe Handlers
  const onPan = (event: any, info: PanInfo) => {
    if (!onReply) return
    // Resistive drag: move less than the finger
    // Max drag: 60px
    if (info.offset.x > 0) {
      const damped = info.offset.x * 0.4
      x.set(Math.min(damped, 60))
    }
  }

  const onPanEnd = (event: any, info: PanInfo) => {
    if (!onReply) return
    // Lower threshold for easier trigger
    if (x.get() > 30) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20)
      }
      onReply()
    }
    // Spring back
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } })
  }

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
          onPan={onPan}
          onPanEnd={onPanEnd}
          animate={controls}
          style={{ x, touchAction: 'pan-y' }}
        >
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
            <AudioPlayer src={audioUrl} mine={mine} />
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
      `}</style>
    </div>
  )
}