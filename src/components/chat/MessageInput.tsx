import React, { useState } from 'react'

export default function MessageInput({ onSend }: { onSend: (text: string) => Promise<void> | void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setBusy(true)
    try {
      await onSend(t)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="chat-input" onSubmit={submit}>
      <input
        type="text"
        placeholder="Type a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <button className="btn btn-primary" disabled={busy || !text.trim()} type="submit">Send</button>
    </form>
  )
}