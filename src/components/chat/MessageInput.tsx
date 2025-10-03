import React, { useState } from 'react'

export default function MessageInput({ onSend }: { onSend: (text: string) => void | Promise<void> }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onSend(t)
    } catch (e) {
      // optional: console.error or toast
      console.error('Send failed:', e)
    } finally {
      setText('')    // always clear input so it doesn’t stick
      setSending(false)
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <input
        className="composer-input"
        placeholder="Type a message…"
        value={text}
        disabled={sending}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button className="composer-send" type="submit" disabled={!text.trim() || sending}>
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}