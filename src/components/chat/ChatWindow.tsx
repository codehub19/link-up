import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

const isMobileKeyboard = () =>
  typeof window !== "undefined" &&
  (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 650)

type M = { id: string; text: string; senderUid: string; createdAt?: any; createdAtMs?: number }

export default function ChatWindow({
  currentUid,
  messages,
  onSend,
}: {
  currentUid: string
  messages: M[]
  onSend: (text: string) => Promise<void> | void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [keyboardActive, setKeyboardActive] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  // Only auto-scroll if user is at bottom (not if they've scrolled up)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    if (!userScrolled) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, userScrolled])

  // Detect user scroll position and show "Go to latest" button
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
      setUserScrolled(!isNearBottom)
      setShowScrollBtn(!isNearBottom)
    }
    el.addEventListener('scroll', onScroll)
    // Initial scroll position
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard: input focus/blur only on mobile
  useEffect(() => {
    if (!isMobileKeyboard()) return
    const composer = document.querySelector('.composer-input')
    if (!composer) return
    const onFocus = () => setKeyboardActive(true)
    const onBlur = () => setKeyboardActive(false)
    composer.addEventListener('focus', onFocus)
    composer.addEventListener('blur', onBlur)
    return () => {
      composer.removeEventListener('focus', onFocus)
      composer.removeEventListener('blur', onBlur)
    }
  }, [])

  // Virtual keyboard with window resize
  useEffect(() => {
    if (!isMobileKeyboard()) return
    let prevHeight = window.innerHeight
    const onResize = () => {
      if (prevHeight - window.innerHeight > 100) setKeyboardActive(true)
      else if (window.innerHeight >= prevHeight - 20) setKeyboardActive(false)
      prevHeight = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Scroll to latest message handler with smooth effect
  const scrollToLatest = () => {
    const el = scrollerRef.current
    if (!el) return
    // For older browsers, fallback to instant scroll if smooth not supported
    try {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      })
    } catch {
      el.scrollTop = el.scrollHeight
    }
    setUserScrolled(false)
    setShowScrollBtn(false)
  }

  return (
    <div className={`chat-window${keyboardActive ? ' keyboard-active' : ''}`}>
      <div className="messages" ref={scrollerRef}>
        {messages.map((m) => {
          const date =
            m.createdAt?.toDate ? new Date(m.createdAt.toDate()) :
            (typeof m.createdAtMs === 'number' ? new Date(m.createdAtMs) : undefined)
          const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
          return (
            <MessageBubble
              key={m.id}
              text={m.text}
              mine={m.senderUid === currentUid}
              time={time}
            />
          )
        })}
        {showScrollBtn && (
          <button
            className="scroll-latest-btn"
            type="button"
            onClick={scrollToLatest}
            aria-label="Scroll to latest"
          >
            ↓ Latest
          </button>
        )}
      </div>
      <div className="composer-wrap">
        <MessageInput onSend={onSend} />
      </div>
      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: height 0.2s;
        }
        .chat-window.keyboard-active {
          height: 60vh;
          min-height: 220px;
          max-height: 75vh;
        }
        .messages {
          flex: 1 1 0%;
          overflow-y: auto;
          padding-bottom: 10px;
          position: relative;
          scroll-behavior: smooth;
        }
        .composer-wrap {
          background: none;
        }
        .scroll-latest-btn {
          position: fixed;
          right: 32px;
          bottom: 86px;
          z-index: 9;
          background: linear-gradient(90deg, #ff5d7c, #ea3d3d 80%);
          color: #fff;
          padding: 9px 22px;
          border-radius: 18px;
          border: none;
          font-size: 1.03rem;
          font-weight: 700;
          box-shadow: 0 2px 12px #18192330;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
        }
        .scroll-latest-btn:hover {
          background: linear-gradient(90deg, #ea3d3d 30%, #ff5d7c 100%);
        }
        @media (max-width: 650px) {
          .chat-window.keyboard-active {
            height: 45vh;
            min-height: 140px;
            max-height: 60vh;
          }
          .scroll-latest-btn {
            right: 10vw;
            bottom: 100px;
            font-size: 0.92rem;
            padding: 8px 18px;
          }
        }
      `}</style>
    </div>
  )
}


















// import React, { useEffect, useRef, useState } from 'react'
// import MessageBubble from './MessageBubble'
// import MessageInput from './MessageInput'

// const isMobile = () =>
//   typeof window !== "undefined" && window.innerWidth <= 650

// type M = { id: string; text: string; senderUid: string; createdAt?: any; createdAtMs?: number }

// export default function ChatWindow({
//   currentUid,
//   messages,
//   onSend,
//   fullScreenMobile = false,
//   header,
// }: {
//   currentUid: string
//   messages: M[]
//   onSend: (text: string) => Promise<void> | void
//   fullScreenMobile?: boolean
//   header?: React.ReactNode
// }) {
//   const scrollerRef = useRef<HTMLDivElement>(null)
//   const [keyboardActive, setKeyboardActive] = useState(false)
//   const [userScrolled, setUserScrolled] = useState(false)
//   const [showScrollBtn, setShowScrollBtn] = useState(false)

//   useEffect(() => {
//     const el = scrollerRef.current
//     if (!el) return
//     if (!userScrolled) {
//       el.scrollTop = el.scrollHeight
//     }
//   }, [messages, userScrolled])

//   useEffect(() => {
//     const el = scrollerRef.current
//     if (!el) return
//     const onScroll = () => {
//       const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
//       setUserScrolled(!isNearBottom)
//       setShowScrollBtn(!isNearBottom)
//     }
//     el.addEventListener('scroll', onScroll)
//     onScroll()
//     return () => el.removeEventListener('scroll', onScroll)
//   }, [])

//   useEffect(() => {
//     if (!isMobile()) return
//     const composer = document.querySelector('.composer-input')
//     if (!composer) return
//     const onFocus = () => setKeyboardActive(true)
//     const onBlur = () => setKeyboardActive(false)
//     composer.addEventListener('focus', onFocus)
//     composer.addEventListener('blur', onBlur)
//     return () => {
//       composer.removeEventListener('focus', onFocus)
//       composer.removeEventListener('blur', onBlur)
//     }
//   }, [])

//   useEffect(() => {
//     if (!isMobile()) return
//     let prevHeight = window.innerHeight
//     const onResize = () => {
//       if (prevHeight - window.innerHeight > 100) setKeyboardActive(true)
//       else if (window.innerHeight >= prevHeight - 20) setKeyboardActive(false)
//       prevHeight = window.innerHeight
//     }
//     window.addEventListener('resize', onResize)
//     return () => window.removeEventListener('resize', onResize)
//   }, [])

//   const scrollToLatest = () => {
//     const el = scrollerRef.current
//     if (!el) return
//     try {
//       el.scrollTo({
//         top: el.scrollHeight,
//         behavior: 'smooth'
//       })
//     } catch {
//       el.scrollTop = el.scrollHeight
//     }
//     setUserScrolled(false)
//     setShowScrollBtn(false)
//   }

//   const showFullScreen = fullScreenMobile && isMobile()

//   return (
//     <div
//       className={`chat-window${keyboardActive ? ' keyboard-active' : ''}`}
//       style={
//         showFullScreen
//           ? {
//               position: 'fixed',
//               inset: 0,
//               zIndex: 9999,
//               display: 'flex',
//               flexDirection: 'column',
//               minHeight: '100dvh',
//               maxHeight: '100dvh',
//               height: '100dvh',
//               width: '100vw',
//               background: '#0f1117',
//               borderRadius: 0,
//               boxShadow: 'none',
//             }
//           : { display: 'flex', flexDirection: 'column', height: '100%' }
//       }
//     >
//       {header && (
//         <div className="chat-window-header" style={{
//           position: 'sticky',
//           top: 0,
//           zIndex: 10,
//           background: '#111219',
//           borderBottom: '1px solid rgba(255,255,255,0.08)',
//           padding: '10px 18px 10px 18px',
//           minHeight: '60px',
//           display: 'flex',
//           alignItems: 'center',
//         }}>
//           {header}
//         </div>
//       )}
//       <div className="messages" ref={scrollerRef} style={{ flex: 1, overflowY: 'auto' }}>
//         {messages.map((m) => {
//           const date =
//             m.createdAt?.toDate ? new Date(m.createdAt.toDate()) :
//             (typeof m.createdAtMs === 'number' ? new Date(m.createdAtMs) : undefined)
//           const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
//           return (
//             <MessageBubble
//               key={m.id}
//               text={m.text}
//               mine={m.senderUid === currentUid}
//               time={time}
//             />
//           )
//         })}
//         {showScrollBtn && (
//           <button
//             className="scroll-latest-btn"
//             type="button"
//             onClick={scrollToLatest}
//             aria-label="Scroll to latest"
//           >
//             ↓ Latest
//           </button>
//         )}
//       </div>
//       <div className="composer-wrap">
//         <MessageInput onSend={onSend} />
//       </div>
//       <style>{`
//         .chat-window {
//           display: flex;
//           flex-direction: column;
//           height: 100%;
//           transition: height 0.2s;
//         }
//         .chat-window.keyboard-active {
//           height: 60vh;
//           min-height: 220px;
//           max-height: 75vh;
//         }
//         .messages {
//           flex: 1 1 0%;
//           overflow-y: auto;
//           padding-bottom: 10px;
//           position: relative;
//           scroll-behavior: smooth;
//         }
//         .composer-wrap {
//           background: none;
//         }
//         .scroll-latest-btn {
//           position: fixed;
//           right: 32px;
//           bottom: 86px;
//           z-index: 9;
//           background: linear-gradient(90deg, #ff5d7c, #ea3d3d 80%);
//           color: #fff;
//           padding: 9px 22px;
//           border-radius: 18px;
//           border: none;
//           font-size: 1.03rem;
//           font-weight: 700;
//           box-shadow: 0 2px 12px #18192330;
//           cursor: pointer;
//           transition: background 0.18s, color 0.18s;
//         }
//         .scroll-latest-btn:hover {
//           background: linear-gradient(90deg, #ea3d3d 30%, #ff5d7c 100%);
//         }
//         @media (max-width: 650px) {
//           .chat-window.keyboard-active {
//             height: 45vh;
//             min-height: 140px;
//             max-height: 60vh;
//           }
//           .scroll-latest-btn {
//             right: 10vw;
//             bottom: 100px;
//             font-size: 0.92rem;
//             padding: 8px 18px;
//           }
//         }
//       `}</style>
//     </div>
//   )
// }