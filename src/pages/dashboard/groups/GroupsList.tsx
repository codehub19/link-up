import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../../../components/ui/EmptyState'
import { Group, subscribeGroups } from '../../../services/groups'
import './Groups.css'

/** Interest groups, shown as a tab in Friends. Your groups first. */
export default function GroupsList({ uid, interests = [] }: { uid: string; interests?: string[] }) {
  const nav = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null)
  useEffect(() => subscribeGroups(setGroups), [])

  if (groups === null) return <div className="gr-list">{[0, 1, 2].map((i) => <div key={i} className="gr-row skeleton" />)}</div>
  if (!groups.length) {
    return <EmptyState icon="sparkle" title="Groups are coming soon" text="Soon you’ll be able to join groups like Gym buddies, Weekend treks and Startup people." />
  }

  const mine = groups.filter((g) => g.memberUids?.includes(uid))
  const rest = groups.filter((g) => !g.memberUids?.includes(uid))
  const lower = interests.map((i) => i.toLowerCase())
  // Groups that match your interests come first
  const match = (g: Group) => lower.some((i) => `${g.name} ${g.category} ${g.description}`.toLowerCase().includes(i)) ? 1 : 0
  rest.sort((a, b) => match(b) - match(a) || (b.memberCount || 0) - (a.memberCount || 0))

  const row = (g: Group) => (
    <button key={g.id} type="button" className="gr-row" onClick={() => nav(`/dashboard/groups/${g.id}`)}>
      <span className="gr-emoji" aria-hidden="true">{g.emoji || '👥'}</span>
      <span className="gr-row-text">
        <strong>{g.name}</strong>
        <small>{g.memberCount || 0} {g.memberCount === 1 ? 'member' : 'members'}{g.description ? ` · ${g.description}` : ''}</small>
      </span>
      <span className="gr-chev" aria-hidden="true">›</span>
    </button>
  )

  return (
    <div className="gr-list">
      <p className="gr-intro">Join a group, post a plan — “badminton Sat 7am?” — and meet people who say “I’m in”.</p>
      {mine.length > 0 && <h3 className="gr-list-title">Your groups</h3>}
      {mine.map(row)}
      {rest.length > 0 && <h3 className="gr-list-title">{mine.length ? 'More groups' : 'Find your people'}</h3>}
      {rest.map(row)}
    </div>
  )
}
