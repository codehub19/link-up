import React, { useState, useRef } from 'react'

export default function MessageInput({ onSend, disabled }: { onSend: (text: string) => void | Promise<void>, disabled?: boolean }) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Prevent blur on send: refocus after clearing text
  const submit = () => {
    if (disabled) return
    const t = text.trim()
    if (!t) return

    // Fire and forget - optimistic update
    onSend(t)

    setText('')
    // Refocus input after send (works for both mobile and desktop)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => { e.preventDefault(); submit() }}
      autoComplete="off"
    >
      <input
        className="field-input composer-input"
        ref={inputRef}
        autoFocus
        placeholder={disabled ? "You cannot send messages" : "Type a message…"}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button
        className={`btn-primary composer-send ${(!text.trim() || disabled) ? 'disabled' : ''}`}
        type="submit"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
      <style>{`
        .composer {
          display: flex;
          gap: 10px;
          align-items: center;
          width: 100%;
        }
        .composer-input {
          flex: 1;
          background: #2a2a35 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          border-radius: 24px !important;
          padding: 12px 16px !important;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .composer-input:focus {
          border-color: #ff416c !important;
          box-shadow: 0 0 0 2px rgba(255, 65, 108, 0.2) !important;
        }
        .composer-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #222 !important;
        }
        .composer-send {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #ff416c, #ff4b2b);
          border: none;
          color: white;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .composer-send:active {
          transform: scale(0.95);
        }
        .composer-send.disabled {
          opacity: 0.5;
          cursor: default;
          background: #333;
          pointer-events: none;
        }
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  )
}