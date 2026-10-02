import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import Navbar from '../../../components/Navbar'
import EmptyState from '../../../components/ui/EmptyState'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../components/ui/Dialog'
import { db } from '../../../firebase'
import { subscribeBlockedEitherWay } from '../../../services/blocks'
import { FriendRequest, sendFriendRequest, subscribeMyFriendRequests } from '../../../services/friends'
import {
  Group, GroupPost, createPost, deletePost, joinGroup, leaveGroup, setImIn, subscribeGroup, subscribePosts,
} from '../../../services/groups'
import { photoOf } from '../../../utils/avatar'
import './Groups.css'

type Person = { uid: string; name?: string; photoUrl?: string; avatar?: any; gender?: string; college?: string }

const first = (n?: string) => (n || 'Student').split(' ')[0]
const ago = (t: any) => {
  const ms = t?.toMillis ? Date.now() - t.toMillis() : 0
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
}

function Avatar({ name, photo, size = 40 }: { name?: string; photo?: string | null; size?: number }) {
  return (
    <span className="gr-avatar" style={{ width: size, height: size }}>
      {photo ? <img src={photo} alt="" loading="lazy" /> : first(name).charAt(0).toUpperCase()}
    </span>
  )
}

export default function GroupDetail() {
  const { id = '' } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const { showConfirm } = useDialog()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [posts, setPosts] = useState<GroupPost[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [text, setText] = useState('')
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [openPost, setOpenPost] = useState<string | null>(null)
  const [people, setPeople] = useState<Record<string, Person>>({})
  const uid = user?.uid

  useEffect(() => subscribeGroup(id, setGroup), [id])
  useEffect(() => subscribePosts(id, setPosts), [id])
  useEffect(() => { if (uid) return subscribeBlockedEitherWay(uid, setBlocked) }, [uid])
  useEffect(() => { if (uid) return subscribeMyFriendRequests(uid, setRequests) }, [uid])

  const known = useMemo(() => new Set(requests.map((r) => (r.from === uid ? r.to : r.from))), [requests, uid])
  const visible = posts.filter((p) => !blocked.has(p.authorUid))
  const member = !!uid && !!group?.memberUids?.includes(uid)

  // Load the people who said "I'm in" to my open post
  useEffect(() => {
    const post = posts.find((p) => p.id === openPost)
    if (!post) return
    const missing = post.inUids.filter((u) => !people[u])
    if (!missing.length) return
    Promise.all(missing.map(async (u) => [u, (await getDoc(doc(db, 'users', u)).catch(() => null))?.data()] as const)).then((pairs) =>
      setPeople((prev) => {
        const next = { ...prev }
        pairs.forEach(([u, d]) => { if (d) next[u] = { uid: u, name: d.name, photoUrl: d.photoUrl, avatar: d.avatar, gender: d.gender, college: d.college } })
        return next
      }))
  }, [openPost, posts])

  if (!user) return null
  if (group === undefined) {
    return (<><Navbar /><div className="dashboard-container gr-page"><div className="gr-row skeleton" /></div></>)
  }
  if (group === null) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container gr-page">
          <EmptyState icon="sparkle" title="Group not found" text="It may have been removed." actions={[{ label: 'All groups', onClick: () => nav('/dashboard/friends?tab=groups') }]} />
        </div>
      </>
    )
  }

  const toggleJoin = async () => {
    setBusy('join')
    try {
      if (member) {
        if (!(await showConfirm(`Leave ${group.name}?`))) return
        await leaveGroup(group.id, user.uid)
      } else {
        await joinGroup(group.id, user.uid)
        toast.success(`You joined ${group.name}`)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const post = async () => {
    if (!text.trim()) return
    setBusy('post')
    try {
      await createPost(group.id, { uid: user.uid, name: profile?.name, photoUrl: profile?.photoUrl, avatar: (profile as any)?.avatar, college: profile?.college }, text, when)
      setText('')
      setWhen('')
      toast.success('Posted! We’ll tell you when people are in.')
    } catch {
      toast.error('Couldn’t post. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const sayHi = async (to: string, name: string | undefined, about: string) => {
    setBusy(`hi-${to}`)
    try {
      await sendFriendRequest(user.uid, to, `About “${about.slice(0, 80)}” in ${group.name} 👋`)
      toast.success(`Request sent to ${first(name)}`)
    } catch {
      toast.error('Couldn’t send. They may have sent you a request already — check Friends → Requests.')
    } finally {
      setBusy(null)
    }
  }

  const report = async (p: GroupPost) => {
    if (!(await showConfirm('Report this post? Our team will review it.'))) return
    await addDoc(collection(db, 'reports'), {
      reporterUid: user.uid, reportedUid: p.authorUid, threadId: `group_${group.id}_${p.id}`,
      reason: `Group post: ${p.text.slice(0, 200)}`, createdAt: serverTimestamp(),
    }).then(() => toast.success('Thanks — we’ll take a look.')).catch(() => toast.error('Couldn’t report. Try again.'))
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container gr-page">
        <header className="gr-head">
          <span className="gr-emoji big" aria-hidden="true">{group.emoji || '👥'}</span>
          <div className="gr-head-text">
            <h1>{group.name}</h1>
            <p>{group.memberCount || 0} {group.memberCount === 1 ? 'member' : 'members'}{group.description ? ` · ${group.description}` : ''}</p>
          </div>
          <button type="button" className={`gr-join ${member ? 'ghost' : ''}`} onClick={toggleJoin} disabled={busy === 'join'}>
            {member ? 'Joined ✓' : 'Join'}
          </button>
        </header>

        {member ? (
          <div className="gr-compose">
            <textarea
              rows={2}
              maxLength={280}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Post a plan — “Anyone up for badminton tomorrow 7am?”"
            />
            <div className="gr-compose-row">
              <input value={when} maxLength={60} onChange={(e) => setWhen(e.target.value)} placeholder="When? (optional) e.g. Sat 7am" />
              <button type="button" className="gr-join" disabled={!text.trim() || busy === 'post'} onClick={post}>{busy === 'post' ? 'Posting…' : 'Post'}</button>
            </div>
            <small className="gr-fine">Be kind. Meet in public places. Posts disappear after 14 days.</small>
          </div>
        ) : (
          <div className="gr-join-hint">Join to post plans and say “I’m in”.</div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="sparkle" title="No plans yet" text={member ? 'Be the first — post something you’d like company for.' : 'Join and post the first plan.'} />
        ) : (
          <div className="gr-feed">
            {visible.map((p) => {
              const mine = p.authorUid === user.uid
              const imIn = p.inUids.includes(user.uid)
              return (
                <article key={p.id} className="gr-post">
                  <div className="gr-post-head">
                    <button type="button" className="gr-post-author" onClick={() => nav(`/profile/${p.authorUid}`)}>
                      <Avatar name={p.authorName} photo={photoOf({ uid: p.authorUid, photoUrl: p.authorPhoto, avatar: p.authorAvatar })} />
                      <span><strong>{mine ? 'You' : p.authorName}</strong><small>{p.authorCollege || 'Student'} · {ago(p.createdAt)}</small></span>
                    </button>
                    {mine ? (
                      <button type="button" className="gr-post-more" aria-label="Delete post" onClick={async () => { if (await showConfirm('Delete this post?')) deletePost(group.id, p.id) }}>🗑</button>
                    ) : (
                      <button type="button" className="gr-post-more" aria-label="Report post" onClick={() => report(p)}>⚑</button>
                    )}
                  </div>
                  {p.when && <span className="gr-when">🗓 {p.when}</span>}
                  <p className="gr-post-text">{p.text}</p>
                  <div className="gr-post-actions">
                    {mine ? (
                      <button type="button" className="gr-in-count" onClick={() => setOpenPost(openPost === p.id ? null : p.id)} disabled={!p.inCount}>
                        {p.inCount ? `${p.inCount} ${p.inCount === 1 ? 'person is' : 'people are'} in ${openPost === p.id ? '▴' : '▾'}` : 'No one yet — share the group!'}
                      </button>
                    ) : (
                      <>
                        <button type="button" className={`gr-in ${imIn ? 'on' : ''}`} disabled={!member || busy === p.id} onClick={async () => {
                          setBusy(p.id)
                          try { await setImIn(group.id, p.id, user.uid, !imIn) } catch { toast.error('Please try again.') } finally { setBusy(null) }
                        }}>
                          {imIn ? '✓ I’m in' : 'I’m in'}{p.inCount ? ` · ${p.inCount}` : ''}
                        </button>
                        {!known.has(p.authorUid) && (
                          <button type="button" className="gr-hi" disabled={busy === `hi-${p.authorUid}`} onClick={() => sayHi(p.authorUid, p.authorName, p.text)}>Say hi 👋</button>
                        )}
                      </>
                    )}
                  </div>
                  {mine && openPost === p.id && (
                    <div className="gr-in-list">
                      {p.inUids.filter((u) => !blocked.has(u)).map((u) => {
                        const person = people[u]
                        return (
                          <div key={u} className="gr-in-row">
                            <button type="button" className="gr-post-author" onClick={() => nav(`/profile/${u}`)}>
                              <Avatar name={person?.name} photo={photoOf(person ?? { uid: u })} size={34} />
                              <span><strong>{first(person?.name)}</strong><small>{person?.college || ''}</small></span>
                            </button>
                            {known.has(u)
                              ? <span className="gr-fine">Already connected</span>
                              : <button type="button" className="gr-hi" disabled={busy === `hi-${u}`} onClick={() => sayHi(u, person?.name, p.text)}>Say hi 👋</button>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
