import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../state/AuthContext'
import { updateProfileAndStatus } from '../../firebase'
import { subscribeBlockedUids } from '../../services/blocks'
import {
  FriendRequest, MAX_PENDING_SENT, acceptFriendRequest, cancelFriendRequest, declineFriendRequest,
  listDiscoverableStudents, removeFriend, sendFriendRequest, subscribeMyFriendRequests,
} from '../../services/friends'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'
import { useCall } from '../../state/CallContext'
import './Friends.css'

type Person = { uid: string; name?: string; photoUrl?: string; college?: string; dob?: string; gender?: string; interests?: string[]; bio?: string; friendsAudience?: 'all' | 'same'; collegeId?: { verified?: boolean }; banned?: boolean }
type Tab = 'discover' | 'requests' | 'friends'

function ageFrom(dob?: string) {
  if (!dob) return ''
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return ''
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

const first = (n?: string) => (n || 'Student').split(' ')[0]

function Avatar({ p, size = 56 }: { p?: Person; size?: number }) {
  return (
    <div className="fr-avatar" style={{ width: size, height: size }}>
      {p?.photoUrl ? <img src={p.photoUrl} alt="" loading="lazy" /> : <span>{first(p?.name).charAt(0).toUpperCase()}</span>}
    </div>
  )
}

/** Friends: students meeting students — no dating, no swiping. */
export default function FriendsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { callPerson } = useCall()
  const nav = useNavigate()
  const { showConfirm } = useDialog()
  const me: any = profile || {}
  const isStudent = me.userType !== 'general'

  const [tab, setTab] = useState<Tab>('discover')
  const [people, setPeople] = useState<Person[]>([])
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [profiles, setProfiles] = useState<Record<string, Person>>({})
  const [scope, setScope] = useState<'college' | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [sayHiTo, setSayHiTo] = useState<Person | null>(null)
  const [hiText, setHiText] = useState('')

  useEffect(() => {
    if (!user) return
    const a = subscribeMyFriendRequests(user.uid, setRequests)
    const b = subscribeBlockedUids(user.uid, setBlocked)
    return () => { a(); b() }
  }, [user])

  useEffect(() => {
    if (!user || !me.friendsVisible) return
    setLoadingPeople(true)
    listDiscoverableStudents(120).then((list) => setPeople(list as Person[])).catch(() => setPeople([])).finally(() => setLoadingPeople(false))
  }, [user, me.friendsVisible])

  // Profiles of people in my requests / friends that aren't in the discover list
  useEffect(() => {
    const want = new Set<string>()
    requests.forEach((r) => want.add(r.from === user?.uid ? r.to : r.from))
    const missing = [...want].filter((u) => !profiles[u] && !people.some((p) => p.uid === u))
    if (!missing.length) return
    Promise.all(missing.map(async (u) => [u, (await getDoc(doc(db, 'users', u)).catch(() => null))?.data()] as const))
      .then((pairs) => setProfiles((prev) => {
        const next = { ...prev }
        pairs.forEach(([u, d]) => { if (d) next[u] = { uid: u, ...(d as any) } })
        return next
      }))
  }, [requests, people, user?.uid])

  const byUid = (u: string): Person | undefined => people.find((p) => p.uid === u) || profiles[u]

  const incoming = requests.filter((r) => r.to === user?.uid && r.status === 'pending')
  const sentPending = requests.filter((r) => r.from === user?.uid && r.status === 'pending')
  const friends = requests.filter((r) => r.status === 'accepted').map((r) => (r.from === user?.uid ? r.to : r.from))
  const related = new Set(requests.map((r) => (r.from === user?.uid ? r.to : r.from)))

  const myInterests = new Set<string>(me.interests || [])
  const discover = useMemo(() => {
    const list = people.filter((p) =>
      p.uid !== user?.uid && !p.banned && !blocked.has(p.uid) && !related.has(p.uid)
      // Respect "only people of my gender can find me"
      && (p.friendsAudience !== 'same' || p.gender === me.gender)
      && (scope === 'all' || (!!me.college && p.college === me.college)))
    const shared = (p: Person) => (p.interests || []).filter((i) => myInterests.has(i)).length
    return list.sort((a, b) => shared(b) - shared(a))
  }, [people, blocked, requests, scope, me.college, me.gender, user?.uid])

  const enable = async () => {
    if (!user) return
    setEnabling(true)
    try {
      await updateProfileAndStatus(user.uid, { friendsVisible: true, friendsAudience: me.friendsAudience || 'all' })
      await refreshProfile()
    } finally {
      setEnabling(false)
    }
  }

  const send = async (p: Person, message: string) => {
    if (!user) return
    if (sentPending.length >= MAX_PENDING_SENT) {
      toast.error(`You have ${MAX_PENDING_SENT} requests waiting. Cancel some or wait for replies.`)
      return
    }
    setBusy(p.uid)
    try {
      await sendFriendRequest(user.uid, p.uid, message)
      toast.success(`Request sent to ${first(p.name)}`)
      setSayHiTo(null)
      setHiText('')
    } catch {
      toast.error('Couldn’t send the request. They may have already sent you one — check Requests.')
    } finally {
      setBusy(null)
    }
  }

  if (!user) return null

  const header = (
    <div className="fr-head">
      <h1 className="fr-title">Friends</h1>
      <p className="fr-sub">Meet students from any college — study buddies, gym partners, people to explore the city with.</p>
    </div>
  )

  let body: React.ReactNode
  if (!isStudent) {
    body = (
      <EmptyState
        icon="sparkle"
        title="Friends is for students"
        text="Friends connects college students with each other. If you’re a student, add your college in Edit Profile."
        actions={[{ label: 'Edit profile', to: '/dashboard/edit-profile' }]}
      />
    )
  } else if (!me.friendsVisible) {
    body = (
      <div className="fr-optin">
        <div className="fr-optin-art" aria-hidden="true">👋</div>
        <h2>Make new friends</h2>
        <ul>
          <li><strong>Students only</strong> — everyone here is a college student.</li>
          <li><strong>Not dating</strong> — this is for friendships, study groups and plans.</li>
          <li><strong>You choose</strong> — people send a request; you decide who to accept.</li>
        </ul>
        <button type="button" className="fr-btn" onClick={enable} disabled={enabling}>{enabling ? 'Turning on…' : 'Turn on Friends'}</button>
        <p className="fr-fine">Your profile photo, first name, college and interests become visible to other students in Friends. You can turn this off any time in Settings.</p>
      </div>
    )
  } else {
    const tabs: [Tab, string, number][] = [['discover', 'Discover', 0], ['requests', 'Requests', incoming.length], ['friends', 'Friends', friends.length]]
    body = (
      <>
        <div className="fr-tabs" role="tablist">
          {tabs.map(([id, label, count]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}{count > 0 && <span className={id === 'requests' ? 'hot' : ''}>{count}</span>}
            </button>
          ))}
        </div>

        {tab === 'discover' && (
          <>
            <div className="fr-scope">
              <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All colleges</button>
              <button className={scope === 'college' ? 'on' : ''} onClick={() => setScope('college')}>My college</button>
            </div>
            {loadingPeople ? (
              <div className="fr-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="fr-card skeleton" />)}</div>
            ) : discover.length === 0 ? (
              <EmptyState
                icon="sparkle"
                title={scope === 'college' ? `No one new from ${me.college || 'your college'} yet` : 'You’ve seen everyone for now'}
                text={scope === 'college' ? 'Try All colleges, or invite your friends — they’ll show up here.' : 'New students join every day. Check back soon, or invite your friends.'}
                actions={scope === 'college'
                  ? [{ label: 'Show all colleges', onClick: () => setScope('all') }]
                  : [{ label: 'Invite friends', to: '/dashboard/' + (me.gender === 'female' ? 'female' : 'male') + '/profile' }]}
              />
            ) : (
              <div className="fr-grid">
                {discover.map((p) => {
                  const shared = (p.interests || []).filter((i) => myInterests.has(i))
                  const age = ageFrom(p.dob)
                  return (
                    <div key={p.uid} className="fr-card">
                      <button type="button" className="fr-card-photo" onClick={() => nav(`/profile/${p.uid}`)} aria-label={`View ${first(p.name)}`}>
                        {p.photoUrl ? <img src={p.photoUrl} alt="" loading="lazy" /> : <span>{first(p.name).charAt(0)}</span>}
                        {p.collegeId?.verified && <em title="Verified student">✓</em>}
                      </button>
                      <div className="fr-card-body">
                        <div className="fr-card-name">{first(p.name)}{age ? `, ${age}` : ''}</div>
                        <div className="fr-card-college">{p.college || 'Student'}</div>
                        {!!(p.interests || []).length && (
                          <div className="fr-card-tags">
                            {(shared.length ? shared : p.interests!).slice(0, 2).map((i) => <span key={i} className={myInterests.has(i) ? 'shared' : ''}>{i}</span>)}
                          </div>
                        )}
                        <button type="button" className="fr-btn sm" disabled={busy === p.uid} onClick={() => { setSayHiTo(p); setHiText('') }}>
                          Say hi 👋
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <div className="fr-list">
            {incoming.length === 0 && sentPending.length === 0 && (
              <EmptyState icon="inbox" title="No requests yet" text="When someone says hi, it shows up here. You can also say hi from Discover." actions={[{ label: 'Discover people', onClick: () => setTab('discover') }]} />
            )}
            {incoming.length > 0 && <h3 className="fr-list-title">Received</h3>}
            {incoming.map((r) => {
              const p = byUid(r.from)
              return (
                <div key={r.id} className="fr-row">
                  <button type="button" className="fr-row-main" onClick={() => nav(`/profile/${r.from}`)}>
                    <Avatar p={p} />
                    <span className="fr-row-text">
                      <strong>{first(p?.name)}</strong>
                      <small>{p?.college || 'Student'}</small>
                      {r.message && <q>{r.message}</q>}
                    </span>
                  </button>
                  <div className="fr-row-actions">
                    <button type="button" className="fr-btn sm" disabled={busy === r.id} onClick={async () => {
                      setBusy(r.id)
                      try { await acceptFriendRequest(r); toast.success(`You and ${first(p?.name)} are now friends`) } catch { toast.error('Couldn’t accept. Please try again.') } finally { setBusy(null) }
                    }}>Accept</button>
                    <button type="button" className="fr-btn sm ghost" disabled={busy === r.id} onClick={async () => {
                      setBusy(r.id)
                      try { await declineFriendRequest(r) } finally { setBusy(null) }
                    }}>Decline</button>
                  </div>
                </div>
              )
            })}
            {sentPending.length > 0 && <h3 className="fr-list-title">Sent</h3>}
            {sentPending.map((r) => {
              const p = byUid(r.to)
              return (
                <div key={r.id} className="fr-row">
                  <div className="fr-row-main">
                    <Avatar p={p} />
                    <span className="fr-row-text"><strong>{first(p?.name)}</strong><small>Waiting for a reply</small></span>
                  </div>
                  <div className="fr-row-actions">
                    <button type="button" className="fr-btn sm ghost" onClick={() => cancelFriendRequest(r.from, r.to)}>Cancel</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'friends' && (
          <div className="fr-list">
            {friends.length === 0 ? (
              <EmptyState icon="heart" title="No friends yet" text="Say hi to a few people in Discover — when they accept, you can chat and call." actions={[{ label: 'Discover people', onClick: () => setTab('discover') }]} />
            ) : friends.map((uid) => {
              const p = byUid(uid)
              return (
                <div key={uid} className="fr-row">
                  <button type="button" className="fr-row-main" onClick={() => nav(`/profile/${uid}`)}>
                    <Avatar p={p} />
                    <span className="fr-row-text"><strong>{p?.name || 'Student'}</strong><small>{p?.college || ''}</small></span>
                  </button>
                  <div className="fr-row-actions">
                    <button type="button" className="fr-btn sm ghost icon" aria-label={`Call ${first(p?.name)}`} onClick={() => callPerson(uid, { name: p?.name, photoUrl: p?.photoUrl })}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    </button>
                    <Link className="fr-btn sm" to={`/dashboard/chat?with=${encodeURIComponent(uid)}`}>Message</Link>
                    <button type="button" className="fr-btn sm ghost icon" aria-label="Remove friend" onClick={async () => {
                      if (await showConfirm(`Remove ${first(p?.name)} from your friends?`)) removeFriend(user.uid, uid)
                    }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container fr-page">
        {header}
        {body}
      </div>

      {sayHiTo && (
        <div className="app-sheet-backdrop" onClick={() => setSayHiTo(null)}>
          <div className="app-sheet fr-hi-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Say hi to ${first(sayHiTo.name)}`}>
            <div className="app-sheet-handle" />
            <Avatar p={sayHiTo} size={64} />
            <h3>Say hi to {first(sayHiTo.name)}</h3>
            <p>Add a short note so they know why you’re reaching out (optional).</p>
            <textarea
              maxLength={140}
              rows={3}
              placeholder={(sayHiTo.interests || []).find((i) => myInterests.has(i))
                ? `Hey! I saw you’re into ${(sayHiTo.interests || []).find((i) => myInterests.has(i))} too…`
                : 'Hey! Want to grab chai after class sometime?'}
              value={hiText}
              onChange={(e) => setHiText(e.target.value)}
            />
            <div className="fr-hi-count">{hiText.length}/140</div>
            <button type="button" className="app-sheet-primary" disabled={busy === sayHiTo.uid} onClick={() => send(sayHiTo, hiText)}>
              {busy === sayHiTo.uid ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" className="app-sheet-secondary" onClick={() => setSayHiTo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}
