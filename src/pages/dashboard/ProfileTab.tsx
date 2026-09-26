import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import EditCollegeId from './EditCollegeId'
import { useAuth } from '../../state/AuthContext'
import { formatHeight, labelFor } from '../../utils/profileLabels'
import './dashboard.css'
import './male/Profile.styles.css'
import './ProfileTab.css'

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
)

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

function ageFrom(dob?: string) {
  if (!dob) return ''
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return ''
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  const m = n.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--
  return a
}

const toMs = (t: any) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0)

/** The Profile tab (shared by men and women; each passes its own referral card). */
export default function ProfileTab({ referral }: { referral?: React.ReactNode }) {
  const { profile, user } = useAuth()
  const nav = useNavigate()
  const [idSheet, setIdSheet] = useState(false)

  const p: any = profile || {}
  const age = ageFrom(p.dob)
  const photos: string[] = (p.photoUrls?.length ? p.photoUrls : p.photoUrl ? [p.photoUrl] : []).filter(Boolean)

  // What's missing, so we can nudge people to finish their profile
  const missing = useMemo(() => {
    const m: string[] = []
    if (photos.length < 2) m.push('add at least 2 photos')
    if (!p.bio) m.push('write a short bio')
    if (!p.interests?.length) m.push('pick your interests')
    if (!p.height) m.push('add your height')
    return m
  }, [photos.length, p.bio, p.interests, p.height])
  const completion = Math.round(((4 - missing.length) / 4) * 100)

  const premiumUntil = toMs(p.premiumUntil)
  const premiumActive = premiumUntil > Date.now()
  const premiumPath = p.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium'

  const cid = p.collegeId || {}
  const isStudent = p.userType !== 'general'
  const idState: 'verified' | 'review' | 'rejected' | 'none' = cid.verified
    ? 'verified'
    : cid.rejected ? 'rejected'
      : (cid.submitted || cid.frontUrl) ? 'review' : 'none'
  const idText = {
    verified: 'Verified student',
    review: 'In review — usually within 24 hours',
    rejected: 'Not approved — tap to upload again',
    none: 'Get a verified badge',
  }[idState]

  return (
    <>
      <HomeBackground />
      <Navbar />
      <div className="dashboard-container pt-page">
        {/* Header */}
        <section className="pt-header">
          <div className="pt-avatar" style={{ ['--pt-progress' as any]: `${completion * 3.6}deg` }}>
            {p.photoUrl
              ? <img src={p.photoUrl} alt="" />
              : <span className="pt-avatar-fallback">{(p.name || '?').charAt(0).toUpperCase()}</span>}
          </div>
          <div className="pt-id">
            <h1 className="pt-name">
              <span className="pt-name-text">{p.name || 'Your profile'}{age ? <span className="pt-age">, {age}</span> : null}</span>
              {cid.verified && (
                <svg className="pt-verified" width="20" height="20" viewBox="0 0 24 24" aria-label="Verified student">
                  <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                  <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </h1>
            <div className="pt-sub">{p.college || (isStudent ? 'Add your college' : 'Working professional')}</div>
            {premiumActive && <span className="pt-premium-pill">★ Premium</span>}
          </div>
        </section>

        <div className="pt-actions">
          <button type="button" className="pt-btn primary" onClick={() => nav('/dashboard/edit-profile')}>Edit profile</button>
          <button type="button" className="pt-btn" onClick={() => user && nav(`/profile/${user.uid}`)}>Preview</button>
          <button type="button" className="pt-btn icon" onClick={() => nav('/dashboard/settings')} aria-label="Settings">
            <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>
          </button>
        </div>

        {missing.length > 0 && (
          <Link to="/dashboard/edit-profile" className="pt-nudge">
            <div className="pt-nudge-top">
              <strong>Profile {completion}% complete</strong>
              <span>Finish</span>
            </div>
            <div className="pt-meter"><span style={{ width: `${completion}%` }} /></div>
            <div className="pt-nudge-text">To get noticed, {missing.join(', ')}.</div>
          </Link>
        )}

        {/* Status rows */}
        <div className="pt-list">
          <button type="button" className="pt-row" onClick={() => nav(premiumPath)}>
            <span className="pt-row-icon premium"><Icon><path d="M2 20h20" /><path d="M4 17 2 7l6 4 4-7 4 7 6-4-2 10z" /></Icon></span>
            <span className="pt-row-body">
              <span className="pt-row-title">DateU Premium</span>
              <span className="pt-row-sub">
                {premiumActive
                  ? `Active until ${new Date(premiumUntil).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
                  : 'Be shown first and get more calls'}
              </span>
            </span>
            <Chevron />
          </button>
          {isStudent && (
            <button type="button" className="pt-row" onClick={() => setIdSheet(true)}>
              <span className={`pt-row-icon id-${idState}`}><Icon><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.5" /><line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="17" y2="14" /></Icon></span>
              <span className="pt-row-body">
                <span className="pt-row-title">College ID</span>
                <span className={`pt-row-sub id-${idState}`}>{idText}</span>
              </span>
              <Chevron />
            </button>
          )}
        </div>

        {/* Photos */}
        <section className="pt-card">
          <div className="pt-card-head">
            <h2>Photos</h2>
            <Link to="/dashboard/edit-profile">Edit</Link>
          </div>
          <div className="pt-photos">
            {photos.slice(0, 6).map((u, i) => (
              <div key={u + i} className="pt-photo"><img src={u} alt="" loading="lazy" />{i === 0 && <span>Main</span>}</div>
            ))}
            {photos.length < 6 && (
              <Link to="/dashboard/edit-profile" className="pt-photo add" aria-label="Add photos">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </Link>
            )}
          </div>
        </section>

        {/* About */}
        <section className="pt-card">
          <div className="pt-card-head">
            <h2>About me</h2>
            <Link to="/dashboard/edit-profile">Edit</Link>
          </div>
          <p className={`pt-bio ${p.bio ? '' : 'empty'}`}>{p.bio || 'Add a few lines about yourself — it’s the first thing people read.'}</p>
          {!!p.interests?.length && (
            <div className="pt-tags">{p.interests.map((i: string) => <span key={i}>{i}</span>)}</div>
          )}
          <dl className="pt-facts">
            <div><dt>Height</dt><dd>{formatHeight(p.height) || '—'}</dd></div>
            <div><dt>Looking for</dt><dd>{labelFor('lookingFor', p.lookingFor) || '—'}</dd></div>
            <div><dt>Open to</dt><dd>{p.datingPreference === 'college_only' ? 'College students' : 'Everyone'}</dd></div>
            {p.loveLanguage && <div><dt>Love language</dt><dd>{labelFor('loveLanguage', p.loveLanguage)}</dd></div>}
          </dl>
        </section>

        {referral}

        <div className="pt-list">
          <button type="button" className="pt-row" onClick={() => nav('/dashboard/support-history')}>
            <span className="pt-row-icon"><Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon></span>
            <span className="pt-row-body"><span className="pt-row-title">My support requests</span></span>
            <Chevron />
          </button>
          <button type="button" className="pt-row" onClick={() => nav('/support')}>
            <span className="pt-row-icon"><Icon><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon></span>
            <span className="pt-row-body"><span className="pt-row-title">Help center</span></span>
            <Chevron />
          </button>
        </div>
      </div>

      {idSheet && (
        <div className="app-sheet-backdrop" onClick={() => setIdSheet(false)}>
          <div className="app-sheet pt-id-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="College ID verification">
            <div className="app-sheet-handle" />
            <p className="pt-id-intro">
              Upload the front and back of your college ID. Only our team sees it — it’s never shown on your profile.
              Verified students get a blue badge.
            </p>
            <EditCollegeId />
            <button type="button" className="app-sheet-secondary" onClick={() => setIdSheet(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
