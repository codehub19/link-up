import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import EmptyState from '../../../components/ui/EmptyState'
import { useAuth } from '../../../state/AuthContext'
import { getProfileViews, ProfileViews } from '../../../services/profileViews'
import './WhoViewed.css'
import { photoOf } from '../../../utils/avatar'

const ago = (t: number) => {
  const h = Math.floor((Date.now() - t) / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Who viewed your profile this week. Everyone sees the number; Premium sees the people. */
export default function WhoViewed() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [data, setData] = useState<ProfileViews | null | undefined>(undefined)
  useEffect(() => { if (user) getProfileViews().then(setData) }, [user])

  const premiumPath = profile?.gender === 'male' ? '/dashboard/plans' : '/dashboard/premium'

  return (
    <>
      <Navbar />
      <div className="dashboard-container wv-page">
        <h1 className="wv-title">Profile views</h1>
        {data === undefined ? (
          <div className="wv-skel" />
        ) : data === null ? (
          <EmptyState icon="sparkle" title="Couldn’t load views" text="Please try again in a moment." />
        ) : (
          <>
            <div className="wv-hero">
              <strong>{data.count}</strong>
              <span>{data.count === 1 ? 'person viewed' : 'people viewed'} your profile in the last 7 days</span>
            </div>

            {!data.showViews ? (
              <div className="wv-note">
                You’ve turned off “Show when I view profiles”, so you can’t see who viewed you either.{' '}
                <Link to="/dashboard/settings">Change in Settings</Link>
              </div>
            ) : data.canSee ? (
              data.viewers.length === 0 ? (
                <EmptyState icon="sparkle" title="No views yet this week" text="Add icebreakers and join an event or group — people check out profiles there." actions={[{ label: 'Edit profile', to: '/dashboard/edit-profile' }]} />
              ) : (
                <div className="wv-list">
                  {data.viewers.map((v) => (
                    <button key={v.uid} type="button" className="wv-row" onClick={() => nav(`/profile/${v.uid}`)}>
                      <span className="wv-avatar"><img src={photoOf(v)} alt="" /></span>
                      <span className="wv-text"><strong>{v.name}</strong><small>{v.college || 'Student'} · {ago(v.at)}</small></span>
                      <span className="wv-chev">›</span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="wv-locked">
                <div className="wv-blur" aria-hidden="true">
                  {Array.from({ length: Math.min(Math.max(data.count, 3), 6) }).map((_, i) => <span key={i} />)}
                </div>
                <h2>See who’s curious about you</h2>
                <p>Premium shows you everyone who viewed your profile, so you can say hi first. It also gives your profile a boost in Friends suggestions.</p>
                <button type="button" className="wv-cta" onClick={() => nav(premiumPath)}>Get Premium</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
