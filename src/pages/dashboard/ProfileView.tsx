import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import Navbar from '../../components/Navbar'
import ReportModal from '../../components/chat/ReportModal'
import { useDialog } from '../../components/ui/Dialog'
import { db, isDatingReady } from '../../firebase'
import { useAuth } from '../../state/AuthContext'
import { useCall } from '../../state/CallContext'
import { threadIdFor } from '../../services/chat'
import { blockUser, subscribeBlockedUids } from '../../services/blocks'
import { reportUser } from '../../services/chatModeration'
import {
  FriendRequest, acceptFriendRequest, cancelFriendRequest, declineFriendRequest, sendFriendRequest, subscribeMyFriendRequests,
} from '../../services/friends'
import { formatHeight, labelFor } from '../../utils/profileLabels'
import './ProfileView.css'

type UserDoc = {
  uid: string
  name?: string
  photoUrl?: string
  photoUrls?: string[]
  bio?: string
  interests?: string[]
  college?: string
  userType?: string
  verified?: boolean
  collegeId?: { verified?: boolean }
  dob?: string
  loveLanguage?: string
  travelPreference?: string
  sundayStyle?: string
  communicationImportance?: string
  conflictApproach?: string
  height?: string
  lookingFor?: string
  [k: string]: any
}

function ageFrom(dob?: string) {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

const I = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>,
  cap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>,
  chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  add: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  more: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>,
}

/** What other people see when they open someone's profile. */
export default function ProfileView() {
  const { uid = '' } = useParams()
  const nav = useNavigate()
  const { user: me, profile: myProfile } = useAuth()
  const { callPerson } = useCall()
  const { showConfirm } = useDialog()
  const [user, setUser] = useState<UserDoc | null | undefined>(undefined)
  const [photo, setPhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [hasThread, setHasThread] = useState(false)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [hiSheet, setHiSheet] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)

  const myUid = me?.uid
  const isMe = myUid === uid

  useEffect(() => {
    setUser(undefined)
    getDoc(doc(db, 'users', uid))
      .then((snap) => setUser(snap.exists() ? ({ uid, ...(snap.data() as any) }) : null))
      .catch(() => setUser(null))
  }, [uid])

  useEffect(() => { if (myUid && !isMe) return subscribeMyFriendRequests(myUid, setRequests) }, [myUid, isMe])
  useEffect(() => { if (myUid) return subscribeBlockedUids(myUid, setBlocked) }, [myUid])
  useEffect(() => {
    if (!myUid || isMe) return
    getDoc(doc(db, 'threads', threadIdFor(myUid, uid)))
      .then((s) => {
        const t = s.data() as any
        // A friend chat closed by unfriending doesn't count
        setHasThread(s.exists() && !(t?.source === 'friend' && t?.friend === false))
      })
      .catch(() => setHasThread(false))
  }, [myUid, uid, isMe])

  const rel = useMemo(() => {
    const out = requests.find((r) => r.from === myUid && r.to === uid)
    const inc = requests.find((r) => r.from === uid && r.to === myUid)
    if (out?.status === 'accepted' || inc?.status === 'accepted') return { kind: 'friends' as const }
    if (inc?.status === 'pending') return { kind: 'received' as const, req: inc }
    if (out?.status === 'pending') return { kind: 'sent' as const }
    return { kind: 'none' as const }
  }, [requests, myUid, uid])

  const photos = useMemo(() => (user ? (user.photoUrls?.length ? user.photoUrls : [user.photoUrl]).filter(Boolean) as string[] : []), [user])

  if (user === undefined) {
    return (
      <>
        <Navbar />
        <div className="pv-page"><div className="pv-skeleton" /></div>
      </>
    )
  }
  if (user === null || (myUid && blocked.has(uid))) {
    return (
      <>
        <Navbar />
        <div className="pv-page pv-missing">
          <div className="pv-missing-emoji">🙈</div>
          <h2>Profile not available</h2>
          <p>This profile may have been removed or hidden.</p>
          <button type="button" className="pv-btn" onClick={() => nav(-1)}>Go back</button>
        </div>
      </>
    )
  }

  const first = (user.name || 'Student').split(' ')[0]
  const age = ageFrom(user.dob)
  const verified = !!(user.verified || user.collegeId?.verified)
  const bothStudents = myProfile?.userType !== 'general' && user.userType !== 'general'
  // Dating details only when both people are into dating; otherwise it's a social profile
  const showDating = isDatingReady(myProfile) && isDatingReady(user)
  const vibe = [
    { k: 'sundayStyle', icon: '☀️', label: 'Ideal Sunday' },
    { k: 'travelPreference', icon: '✈️', label: 'Travel' },
    { k: 'communicationImportance', icon: '💬', label: 'Texting' },
    { k: 'conflictApproach', icon: '🤝', label: 'Disagreements' },
  ].filter((f) => user[f.k])

  const onScroll = () => {
    const el = stripRef.current
    if (el) setPhoto(Math.round(el.scrollLeft / el.clientWidth))
  }
  const go = (i: number) => stripRef.current?.scrollTo({ left: i * (stripRef.current?.clientWidth || 0), behavior: 'smooth' })

  const sendHi = async () => {
    if (!myUid) return
    setBusy(true)
    try {
      await sendFriendRequest(myUid, uid, note)
      setHiSheet(false)
      setNote('')
      toast.success(`Friend request sent to ${first}`)
    } catch {
      toast.error('Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const canMessage = rel.kind === 'friends' || hasThread
  let actions: JSX.Element | null = null
  if (isMe) {
    actions = (
      <div className="pv-actions">
        <button type="button" className="pv-btn" onClick={() => nav('/dashboard/edit-profile')}>Edit profile</button>
      </div>
    )
  } else {
    actions = (
      <div className="pv-actions">
        {rel.kind === 'received' && rel.req ? (
          <>
            <button type="button" className="pv-btn" disabled={busy} onClick={async () => { setBusy(true); try { await acceptFriendRequest(rel.req!); toast.success(`You and ${first} are now friends 🎉`) } finally { setBusy(false) } }}>Accept friend request</button>
            <button type="button" className="pv-btn ghost" disabled={busy} onClick={() => declineFriendRequest(rel.req!)}>Decline</button>
          </>
        ) : canMessage ? (
          <>
            <button type="button" className="pv-btn" onClick={() => nav(`/dashboard/chat?with=${encodeURIComponent(uid)}`)}>{I.chat} Message</button>
            <button type="button" className="pv-btn ghost icon" aria-label={`Call ${first}`} onClick={() => callPerson(uid, { name: user.name, photoUrl: user.photoUrl })}>{I.phone}</button>
          </>
        ) : rel.kind === 'sent' ? (
          <button type="button" className="pv-btn ghost" onClick={async () => { if (myUid && await showConfirm('Cancel your friend request?')) cancelFriendRequest(myUid, uid) }}>Request sent · Cancel</button>
        ) : bothStudents ? (
          <button type="button" className="pv-btn" onClick={() => setHiSheet(true)}>{I.add} Add friend</button>
        ) : null}
        <button type="button" className="pv-btn ghost icon" aria-label="More" onClick={() => setMenu(true)}>{I.more}</button>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="pv-page">
        {/* Photos */}
        <div className="pv-photos">
          {photos.length ? (
            <div className="pv-strip" ref={stripRef} onScroll={onScroll}>
              {photos.map((p, i) => (
                <button key={i} type="button" className="pv-photo" onClick={() => setLightbox(true)} aria-label="View photo">
                  <img src={p} alt={i === 0 ? `${first}'s photo` : ''} loading={i ? 'lazy' : 'eager'} />
                </button>
              ))}
            </div>
          ) : (
            <div className="pv-photo empty">{first.charAt(0).toUpperCase()}</div>
          )}
          {photos.length > 1 && (
            <div className="pv-dots">
              {photos.map((_, i) => <button key={i} type="button" className={i === photo ? 'on' : ''} onClick={() => go(i)} aria-label={`Photo ${i + 1}`} />)}
            </div>
          )}
        </div>

        {/* Name card */}
        <section className="pv-card pv-head">
          <h1>
            {user.name || 'Student'}{age ? <span>, {age}</span> : null}
            {verified && <span className="pv-verified" title="Verified student">{I.check}</span>}
          </h1>
          {user.college && <p className="pv-college">{I.cap} {user.college}</p>}
          <div className="pv-badges">
            {verified && <span className="pv-badge green">Verified student</span>}
            {rel.kind === 'friends' && <span className="pv-badge">👋 Friends</span>}
            {rel.kind === 'received' && <span className="pv-badge pink">Wants to be friends</span>}
          </div>
          {actions}
        </section>

        {(user.bio || user.interests?.length) && (
          <section className="pv-card">
            {user.bio && (
              <>
                <h2>About</h2>
                <p className="pv-bio">{user.bio}</p>
              </>
            )}
            {!!user.interests?.length && (
              <>
                <h2 className={user.bio ? 'spaced' : ''}>Into</h2>
                <div className="pv-tags">
                  {user.interests.map((t) => {
                    const shared = !!myProfile?.interests?.includes(t) && !isMe
                    return <span key={t} className={shared ? 'shared' : ''}>{shared ? '✨ ' : ''}{t}</span>
                  })}
                </div>
                {!isMe && myProfile?.interests?.some((t: string) => user.interests?.includes(t)) && (
                  <p className="pv-hint">✨ You both like these</p>
                )}
              </>
            )}
          </section>
        )}

        {vibe.length > 0 && (
          <section className="pv-card">
            <h2>Vibe</h2>
            <div className="pv-facts">
              {vibe.map((f) => (
                <div key={f.k} className="pv-fact">
                  <span className="pv-fact-icon">{f.icon}</span>
                  <span><small>{f.label}</small><strong>{labelFor(f.k as any, user[f.k])}</strong></span>
                </div>
              ))}
            </div>
          </section>
        )}

        {showDating && (user.height || user.lookingFor || user.loveLanguage) && (
          <section className="pv-card">
            <h2>Dating</h2>
            <div className="pv-facts">
              {user.lookingFor && <div className="pv-fact"><span className="pv-fact-icon">💘</span><span><small>Looking for</small><strong>{labelFor('lookingFor', user.lookingFor)}</strong></span></div>}
              {user.height && <div className="pv-fact"><span className="pv-fact-icon">📏</span><span><small>Height</small><strong>{formatHeight(user.height)}</strong></span></div>}
              {user.loveLanguage && <div className="pv-fact"><span className="pv-fact-icon">❤️</span><span><small>Love language</small><strong>{labelFor('loveLanguage', user.loveLanguage)}</strong></span></div>}
            </div>
          </section>
        )}

        {!isMe && <p className="pv-safety">Be kind and keep it respectful. You can report or block anyone from the ⋮ menu.</p>}
      </div>

      {lightbox && photos.length > 0 && (
        <div className="pv-lightbox" onClick={() => setLightbox(false)} role="dialog" aria-label="Photo">
          <img src={photos[photo] || photos[0]} alt="" />
        </div>
      )}

      {hiSheet && (
        <div className="pv-sheet-backdrop" onClick={() => setHiSheet(false)} role="dialog" aria-modal="true" aria-label="Add friend">
          <div className="pv-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pv-sheet-handle" />
            <h3>Say hi to {first} 👋</h3>
            <p>Add a short note so {first} knows why you’d like to connect (optional).</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={3}
              placeholder={myProfile?.interests?.find((t: string) => user.interests?.includes(t)) ? `Hey! I'm into ${myProfile.interests.find((t: string) => user.interests?.includes(t))} too 😄` : 'Hey! Want to hang out sometime?'} />
            <small className="pv-count">{note.length}/140</small>
            <div className="pv-sheet-actions">
              <button type="button" className="pv-btn ghost" onClick={() => setHiSheet(false)}>Cancel</button>
              <button type="button" className="pv-btn" onClick={sendHi} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </div>
          </div>
        </div>
      )}

      {menu && (
        <div className="pv-sheet-backdrop" onClick={() => setMenu(false)} role="dialog" aria-modal="true" aria-label="More options">
          <div className="pv-sheet menu" onClick={(e) => e.stopPropagation()}>
            <div className="pv-sheet-handle" />
            <button type="button" onClick={async () => {
              setMenu(false)
              const url = `${window.location.origin}/profile/${uid}`
              try { if (navigator.share) await navigator.share({ title: `${first} on DateU`, url }); else { await navigator.clipboard.writeText(url); toast.success('Link copied') } } catch { }
            }}>Share profile</button>
            <button type="button" onClick={() => { setMenu(false); setReport(true) }}>Report {first}</button>
            <button type="button" className="danger" onClick={async () => {
              setMenu(false)
              if (!myUid || !(await showConfirm(`Block ${first}? They won’t be able to see you or message you.`))) return
              await blockUser(myUid, uid)
              toast(`${first} is blocked`)
              nav(-1)
            }}>Block {first}</button>
            <button type="button" className="cancel" onClick={() => setMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      <ReportModal
        open={report}
        onClose={() => setReport(false)}
        onSubmit={async (reason) => {
          if (!myUid) return
          await reportUser({ reporterUid: myUid, reportedUid: uid, threadId: `profile_${uid}`, reason })
        }}
      />
    </>
  )
}
