import React from 'react'

export default function MessageBubble({
  text, mine, time,
}: {
  text: string
  mine: boolean
  time?: string
}) {
  return (
    <div className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
      <div className="bubble">
        <div className="text">{text}</div>
        {time && <div className="time">{time}</div>}
      </div>
      <style>{`
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
        .bubble {
          max-width: 75%;
          padding: 10px 16px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
        .time {
          font-size: 0.65rem;
          margin-top: 4px;
          opacity: 0.7;
          text-align: right;
        }
        .msg-row.theirs .time {
          text-align: left;
          color: #a6a7bb;
        }
      `}</style>
    </div>
  )
}