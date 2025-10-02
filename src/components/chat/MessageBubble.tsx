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
        {time ? <div className="time">{time}</div> : null}
      </div>
    </div>
  )
}