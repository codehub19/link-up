import React, { useEffect, useMemo, useState } from 'react'
import ChatWindow from './ChatWindow'
import { ensureThread, sendMessage, subscribeMessages, ChatMessage } from '../../services/chat'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'

type UserDoc = { uid: string; name?: string; photoUrl?: string; instagramId?: string }

export default function InlineChatDrawer({
  open,
  currentUid,
  peerUid,
  onClose,
}: {
  open: boolean
  currentUid: string
  peerUid?: string
  onClose: () => void
}) {
  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peer, setPeer] = useState<UserDoc | undefined>(undefined)

  useEffect(() => {
    if (!open || !peerUid) return
    let stop: (() => void) | undefined

    const run = async () => {
      // fetch peer (for header)
      const rs = await getDocs(query(collection(db, 'users'), where('uid', '==', peerUid)))
      const d = rs.docs[0]?.data() as UserDoc | undefined
      setPeer(d)

      const id = await ensureThread(currentUid, peerUid)
      setThreadId(id)
      stop = subscribeMessages(id, setMessages)
    }
    run()

    return () => { if (stop) stop() }
  }, [open, peerUid, currentUid])

  const onSend = async (text: string) => {
    if (!threadId) return
    await sendMessage(threadId, currentUid, text)
  }

  return (
    <div className={`chat-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="chat-drawer-header">
        <div className="avatar">{peer?.photoUrl ? <img src={peer.photoUrl} alt={peer?.name || 'user'} /> : <div className="avatar-fallback">{(peer?.name || 'U').slice(0,1)}</div>}</div>
        <div className="peer-name">{peer?.name || 'Chat'}</div>
        <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="chat-drawer-body">
        <ChatWindow currentUid={currentUid} messages={messages} onSend={onSend} />
      </div>
    </div>
  )
}