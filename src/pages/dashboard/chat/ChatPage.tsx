import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import { useAuth } from '../../../state/AuthContext'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import ChatSidebar from '../../../components/chat/ChatSidebar'
import ChatWindow from '../../../components/chat/ChatWindow'
import { ensureThread, sendMessage, threadIdFor } from '../../../services/chat'
import MaleTabs from '../../../components/MaleTabs'
import FemaleTabs from '../../../components/FemaleTabs'

type UserDoc = { uid: string; name?: string; photoUrl?: string; instagramId?: string }

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function ChatPage() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const q = useQuery()
  const withUid = q.get('with') || undefined

  const [threads, setThreads] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<any[]>([])

  // Load my threads
  useEffect(() => {
    if (!user) return
    const threadsQ = query(
      collection(db, 'threads'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    )
    const stop = onSnapshot(threadsQ, async (snap) => {
      const ts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setThreads(ts)

      // Fetch peer user docs (only peers)
      const peers = Array.from(new Set(ts.flatMap((t: any) => t.participants).filter((p: string) => p !== user.uid)))
      if (peers.length) {
        const { getDocs, query: q2, collection: coll, where: w } = await import('firebase/firestore')
        const usersSnaps = await Promise.all(
          peers.map(async (uid) => {
            const r = await getDocs(q2(coll(db, 'users'), w('uid', '==', uid)))
            const d = r.docs[0]?.data() as UserDoc | undefined
            return d && { [d.uid]: d }
          })
        )
        const map: Record<string, UserDoc> = {}
        usersSnaps.forEach((entry) => entry && Object.assign(map, entry))
        setUsers(map)
      }
    })
    return () => stop()
  }, [user])

  // If ?with=<uid>, ensure the thread exists and select it.
  useEffect(() => {
    const run = async () => {
      if (!user) return
      if (withUid) {
        const tid = await ensureThread(user.uid, withUid)
        setSelectedId(tid)
      } else if (!selectedId && threads.length > 0) {
        setSelectedId(threads[0].id)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUid, user, threads.length])

  // Subscribe to messages of selected thread
  useEffect(() => {
    if (!selectedId) return
    const msgsQ = query(collection(db, 'threads', selectedId, 'messages'), orderBy('createdAt', 'asc'))
    const stop = onSnapshot(msgsQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => stop()
  }, [selectedId])

  const onSend = async (text: string) => {
    if (!user || !selectedId) return
    await sendMessage(selectedId, user.uid, text)
  }

  // When user clicks on a thread in the sidebar
  const selectThread = (id: string) => {
    setSelectedId(id)
    if (user) {
      const t = threads.find((x) => x.id === id)
      if (t) {
        const peer = (t.participants as string[]).find((p) => p !== user.uid)
        if (peer) nav(`/dashboard/chat?with=${encodeURIComponent(peer)}`, { replace: true })
      }
    }
  }

  // Normalize invalid ?with
  useEffect(() => {
    if (!user || !withUid) return
    if (withUid === user.uid) {
      const fallback = threads[0]?.id
      if (fallback) setSelectedId(fallback)
    } else {
      const id = threadIdFor(user.uid, withUid)
      if (threads.some((t) => t.id === id)) setSelectedId(id)
    }
  }, [withUid, user, threads])

  if (!user) return null

  const isFemale = profile?.gender === 'female'

  return (
    <>
      <Navbar />
      <div className="container">
        {isFemale ? <FemaleTabs /> : <MaleTabs />}
        <h2>Chat</h2>
        <div className="chat-shell">
          <ChatSidebar
            threads={threads}
            selectedId={selectedId}
            onSelect={selectThread}
            users={users}
            currentUid={user.uid}
          />
          <div className="chat-main">
            {selectedId ? (
              <ChatWindow currentUid={user.uid} messages={messages} onSend={onSend} />
            ) : (
              <div className="chat-empty">No conversation selected</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}