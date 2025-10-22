import React, { useState, useRef } from 'react'

export default function MessageInput({ onSend }: { onSend: (text: string) => void | Promise<void> }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Prevent blur on send: refocus after clearing text
  const submit = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onSend(t)
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setText('')
      setSending(false)
      // Refocus input after send (works for both mobile and desktop)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => { e.preventDefault(); submit() }}
      autoComplete="off"
    >
      <input
        className="composer-input"
        ref={inputRef}
        autoFocus
        placeholder="Type a message…"
        value={text}
        disabled={sending}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
            setTimeout(() => {
              inputRef.current?.focus()
            }, 0)
          }
        }}
      />
      <button className="composer-send" type="submit" disabled={!text.trim() || sending}>
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}