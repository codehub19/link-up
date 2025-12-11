import React, { useState, useRef, useEffect } from 'react'
import { uploadChatAudio } from '../../firebase'

export default function MessageInput({
  onSend,
  disabled,
  currentUid,
  onTyping,
  replyTo,
  onCancelReply,
  editingMessage,
  onEditConfirm,
  onCancelEdit
}: {
  onSend: (text: string, audio?: { url: string, duration: number }) => void | Promise<void>,
  disabled?: boolean,
  currentUid?: string,
  onTyping?: (isTyping: boolean) => void,
  replyTo?: { id: string; text: string; senderUid: string; type?: 'text' | 'audio' } | null
  onCancelReply?: () => void
  editingMessage?: { id: string, text: string } | null
  onEditConfirm?: (id: string, newText: string) => void
  onCancelEdit?: () => void
}) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number>()
  const typingTimeoutRef = useRef<number>()

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [replyTo])

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text)
      inputRef.current?.focus()
    }
  }, [editingMessage])

  const handleTyping = (val: string) => {
    setText(val)
    if (onTyping) {
      onTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = window.setTimeout(() => {
        onTyping(false)
      }, 2000)
    }
  }

  const submit = () => {
    if (disabled || isRecording) return
    const t = text.trim()
    if (!t) return

    if (onTyping && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      onTyping(false)
    }

    if (editingMessage && onEditConfirm) {
      onEditConfirm(editingMessage.id, t)
      setText('')
      return
    }

    onSend(t)
    setText('')
    if (onCancelReply) onCancelReply();
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const startRecording = async () => {
    if (disabled) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone')
    }
  }

  const stopRecording = async (shouldSend: boolean) => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)

    // Create a promise to wait for the stop event
    const stopPromise = new Promise<{ blob: Blob, duration: number }>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const duration = recordingTime
        // Stop all tracks
        recorder.stream.getTracks().forEach(track => track.stop())
        resolve({ blob, duration })
      }
    })

    recorder.stop()
    const { blob, duration } = await stopPromise

    if (shouldSend && currentUid) {
      setIsUploading(true)
      try {
        const url = await uploadChatAudio(currentUid, blob)
        onSend('', { url, duration })
        if (onCancelReply) onCancelReply();
      } catch (error) {
        console.error('Failed to upload audio', error)
        alert('Failed to send audio message')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="composer-root">
      {editingMessage && (
        <div className="editing-banner">
          <div className="editing-info">
            <span className="editing-label">Editing Message</span>
            <span className="editing-text text-truncate">{editingMessage.text}</span>
          </div>
          <button className="editing-close" onClick={onCancelEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      {isRecording ? (
        <div className="recording-ui">
          <div className="rec-indicator">
            <div className="red-dot"></div>
            <span>{formatTime(recordingTime)}</span>
          </div>
          <div className="rec-actions">
            <button
              className="icon-btn cancel-rec"
              onClick={() => stopRecording(false)}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <button
              className="icon-btn send-rec"
              onClick={() => stopRecording(true)}
              type="button"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="spinner-sm"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="composer"
          onSubmit={(e) => { e.preventDefault(); submit() }}
          autoComplete="off"
        >
          <input
            className="field-input composer-input"
            ref={inputRef}
            // autofocus removed intentionally to prevent keyboard popup on mobile nav
            placeholder={disabled ? "You cannot send messages" : "Type a message…"}
            value={text}
            disabled={disabled}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
          />

          {!text.trim() && (
            <button
              className="icon-btn mic-btn"
              type="button"
              onClick={startRecording}
              disabled={disabled}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
          )}

          {text.trim() && (
            <button
              className="btn-primary composer-send"
              type="submit"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
            >
              {editingMessage ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
          )}
        </form>
      )}

      <style>{`
        .composer-root {
          width: 100%;
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
        }
        .composer {
          display: flex;
          gap: 10px;
          align-items: center;
          width: 100%;
        }
        .editing-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #23232f;
          padding: 8px 12px;
          border-radius: 12px;
          margin-bottom: 8px;
          border-left: 3px solid #4da6ff;
        }
        .editing-info {
          display: flex;
          flex-direction: column;
          font-size: 0.85rem;
          overflow: hidden;
        }
        .editing-label {
          color: #4da6ff;
          font-weight: 500;
          font-size: 0.75rem;
        }
        .editing-text {
          color: rgba(255,255,255,0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .editing-close {
           background: transparent;
           border: none;
           color: rgba(255,255,255,0.5);
           cursor: pointer;
           padding: 4px;
        }
        .editing-close:hover { color: white; }
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
        .mic-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #a6a7bb;
          background: transparent;
          cursor: pointer;
        }
        .mic-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .recording-ui {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: #2a2a35;
          border-radius: 24px;
          padding: 6px 16px;
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rec-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ff416c;
          font-weight: 600;
          font-family: monospace;
          font-size: 1.1rem;
        }
        .red-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff416c;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .rec-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .cancel-rec {
          color: #a6a7bb;
          cursor: pointer;
          padding: 8px;
        }
        .cancel-rec:hover { color: white; }
        .send-rec {
          color: #ff416c;
          cursor: pointer;
          padding: 8px;
        }
        .send-rec:hover { transform: scale(1.1); }
        
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
    </div>
  )
}