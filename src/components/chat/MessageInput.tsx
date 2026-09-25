import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { uploadChatAudio } from '../../firebase'
import { useDialog } from '../ui/Dialog'

type Reply = { id: string; text: string; senderUid: string; type?: 'text' | 'audio' }

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.2 15 12 3.4 13.8z" />
  </svg>
)

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
)

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function MessageInput({
  onSend,
  disabled,
  disabledReason,
  currentUid,
  peerName,
  onTyping,
  replyTo,
  onCancelReply,
  editingMessage,
  onEditConfirm,
  onCancelEdit,
}: {
  onSend: (text: string, audio?: { url: string; duration: number }) => void | Promise<void>
  disabled?: boolean
  disabledReason?: string
  currentUid?: string
  peerName?: string
  onTyping?: (isTyping: boolean) => void
  replyTo?: Reply | null
  onCancelReply?: () => void
  editingMessage?: { id: string; text: string } | null
  onEditConfirm?: (id: string, newText: string) => void
  onCancelEdit?: () => void
}) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const { showAlert } = useDialog()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const secondsRef = useRef(0)
  const timerRef = useRef<number>()
  const typingRef = useRef<number>()

  useEffect(() => () => {
    window.clearInterval(timerRef.current)
    window.clearTimeout(typingRef.current)
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text)
      inputRef.current?.focus()
    } else {
      setText('')
    }
  }, [editingMessage])

  // Grow the field with its content (up to ~5 lines)
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const change = (val: string) => {
    setText(val)
    if (!onTyping) return
    onTyping(true)
    window.clearTimeout(typingRef.current)
    typingRef.current = window.setTimeout(() => onTyping(false), 2000)
  }

  const submit = () => {
    if (disabled || recording) return
    const t = text.trim()
    if (!t) return
    window.clearTimeout(typingRef.current)
    onTyping?.(false)
    if (editingMessage && onEditConfirm) {
      onEditConfirm(editingMessage.id, t)
    } else {
      onSend(t)
      onCancelReply?.()
    }
    setText('')
    // Keep the keyboard open for the next message
    inputRef.current?.focus()
  }

  const startRecording = async () => {
    if (disabled) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start()
      secondsRef.current = 0
      setSeconds(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
      }, 1000)
    } catch {
      await showAlert('DateU needs microphone access to record a voice message. You can allow it in your browser or phone settings.')
    }
  }

  const stopRecording = async (send: boolean) => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    window.clearInterval(timerRef.current)
    setRecording(false)
    const duration = secondsRef.current
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop())
        resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }))
      }
      rec.stop()
    })
    recorderRef.current = null
    if (!send || !currentUid || duration < 1) return
    setUploading(true)
    try {
      const url = await uploadChatAudio(currentUid, blob)
      await onSend('', { url, duration })
      onCancelReply?.()
    } catch {
      await showAlert('Could not send your voice message. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (disabled) {
    return <div className="dm-disabled-note">{disabledReason || 'You can’t send messages in this chat.'}</div>
  }

  const hasText = !!text.trim()

  return (
    <>
      {editingMessage && (
        <div className="dm-context edit">
          <div className="dm-context-body">
            <div className="dm-context-label">Editing message</div>
            <div className="dm-context-text">{editingMessage.text}</div>
          </div>
          <button type="button" className="dm-icon-btn" onClick={onCancelEdit} aria-label="Cancel editing"><CloseIcon /></button>
        </div>
      )}
      {replyTo && !editingMessage && (
        <div className="dm-context">
          <div className="dm-context-body">
            <div className="dm-context-label">Replying to {replyTo.senderUid === currentUid ? 'yourself' : (peerName || 'message')}</div>
            <div className="dm-context-text">{replyTo.type === 'audio' ? '🎤 Voice message' : replyTo.text}</div>
          </div>
          <button type="button" className="dm-icon-btn" onClick={onCancelReply} aria-label="Cancel reply"><CloseIcon /></button>
        </div>
      )}

      <div className="dm-compose-row">
        {recording || uploading ? (
          <>
            <button type="button" className="dm-send mic" onClick={() => stopRecording(false)} disabled={uploading} aria-label="Discard recording">
              <CloseIcon />
            </button>
            <div className="dm-recording">
              {uploading ? <>Sending…</> : <><span className="dm-rec-dot" /> Recording {fmt(seconds)}</>}
            </div>
            <button type="button" className="dm-send" onClick={() => stopRecording(true)} disabled={uploading} aria-label="Send voice message">
              {uploading ? <span className="dm-spinner" /> : <SendIcon />}
            </button>
          </>
        ) : (
          <>
            <div className="dm-field">
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                placeholder="Message…"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                spellCheck
                aria-label="Message"
                onChange={(e) => change(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
                    e.preventDefault()
                    submit()
                  }
                }}
              />
            </div>
            {hasText || editingMessage ? (
              <button
                type="button"
                className="dm-send"
                onClick={submit}
                onMouseDown={(e) => e.preventDefault()} // don't close the keyboard
                disabled={!hasText}
                aria-label={editingMessage ? 'Save edit' : 'Send'}
              >
                {editingMessage ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                ) : <SendIcon />}
              </button>
            ) : (
              <button type="button" className="dm-send mic" onClick={startRecording} aria-label="Record a voice message">
                <MicIcon />
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
