import React, { useEffect, useState } from 'react'
import ChatWindow from './ChatWindow'
import { ensureThread, sendMessage, subscribeMessages, ChatMessage } from '../../services/chat'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import '../../styles/chat.css'

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
      // Fetch peer: try doc id first, then fallback to field query
      let peerData: UserDoc | undefined
      const direct = await getDoc(doc(db, 'users', peerUid))
      if (direct.exists()) {
        peerData = { uid: peerUid, ...(direct.data() as any) }
      } else {
        const rs = await getDocs(query(collection(db, 'users'), where('uid', '==', peerUid)))
        const d0 = rs.docs[0]?.data() as any
        if (d0) peerData = { uid: d0.uid ?? peerUid, ...d0 }
      }
      setPeer(peerData)

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

  if (!open || !peerUid) return null

  return (
    <div className={`chat-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="chat-drawer-header">
        <div className="avatar">
          {peer?.photoUrl ? <img src={peer.photoUrl} alt={peer?.name || 'user'} /> : <div className="avatar-fallback">{(peer?.name || 'U').slice(0,1)}</div>}
        </div>
        <div className="peer-name">{peer?.name || 'Chat'}</div>
        <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="chat-drawer-body">
        <ChatWindow currentUid={currentUid} messages={messages} onSend={onSend} />
      </div>
    </div>
  )
}