import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { AdminUser, downloadCsv, formatDate, listAllUsers, timeAgo, toMillis } from '../../services/adminTools'

type Filter = 'all' | 'male' | 'female' | 'incomplete' | 'premium' | 'banned' | 'admins' | 'phone' | 'id-pending' | 'id-verified'
type Sort = 'recent-login' | 'newest' | 'oldest' | 'name'

const PAGE = 50

/** Every user, searchable and filterable, with quick access to the full profile. */
export default function UsersAdmin() {
  const nav = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [premium, setPremium] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('recent-login')
  const [page, setPage] = useState(0)

  useEffect(() => {
    Promise.all([listAllUsers(), getDocs(collection(db, 'subscriptions'))])
      .then(([us, subs]) => {
        setUsers(us)
        setPremium(new Set(subs.docs.filter((d) => d.data().status === 'active').map((d) => d.data().uid)))
      })
      .catch((e) => setError(e?.message || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = users.filter((u) => {
      if (q) {
        const hay = [u.name, u.email, u.phoneNumber, u.instagramId, u.college, u.uid].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      switch (filter) {
        case 'male': return u.gender === 'male'
        case 'female': return u.gender === 'female'
        case 'incomplete': return !u.isProfileComplete
        case 'premium': return premium.has(u.uid)
        case 'banned': return !!u.banned
        case 'admins': return !!u.isAdmin
        case 'phone': return !!u.isPhoneVerified
        case 'id-pending': return !!u.collegeId && !u.collegeId.verified && !u.collegeId.rejected && (u.collegeId.submitted || u.collegeId.frontUrl)
        case 'id-verified': return !!u.collegeId?.verified
        default: return true
      }
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest': return toMillis(b.createdAt) - toMillis(a.createdAt)
        case 'oldest': return toMillis(a.createdAt) - toMillis(b.createdAt)
        case 'name': return (a.name || '').localeCompare(b.name || '')
        default: return toMillis(b.lastLoginAt) - toMillis(a.lastLoginAt)
      }
    })
    return list
  }, [users, premium, search, filter, sort])

  useEffect(() => setPage(0), [search, filter, sort])
  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))

  const exportCsv = () => downloadCsv(`dateu-users-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((u) => ({
    uid: u.uid,
    name: u.name || '',
    email: u.email || '',
    phone: u.phoneNumber || '',
    gender: u.gender || '',
    type: u.userType || '',
    college: u.college || '',
    instagram: u.instagramId || '',
    profileComplete: !!u.isProfileComplete,
    phoneVerified: !!u.isPhoneVerified,
    premium: premium.has(u.uid),
    banned: !!u.banned,
    admin: !!u.isAdmin,
    joined: formatDate(u.createdAt),
    lastLogin: formatDate(u.lastLoginAt, true),
  })))

  const counts = useMemo(() => ({
    total: users.length,
    male: users.filter((u) => u.gender === 'male').length,
    female: users.filter((u) => u.gender === 'female').length,
    premium: premium.size,
    banned: users.filter((u) => u.banned).length,
  }), [users, premium])

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Users</h2>
          <div className="admin-page-sub">
            {counts.total.toLocaleString()} total · {counts.male} men · {counts.female} women · {counts.premium} premium · {counts.banned} banned
          </div>
        </div>
        <button className="btn" onClick={exportCsv} disabled={!filtered.length}>Export CSV ({filtered.length})</button>
      </div>

      <div className="admin-toolbar">
        <input className="input grow" placeholder="Search name, email, phone, Instagram, college or UID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All users</option>
          <option value="male">Men</option>
          <option value="female">Women</option>
          <option value="incomplete">Profile incomplete</option>
          <option value="premium">Premium (active plan)</option>
          <option value="phone">Phone verified</option>
          <option value="id-pending">College ID pending</option>
          <option value="id-verified">College ID verified</option>
          <option value="banned">Banned</option>
          <option value="admins">Admins</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent-login">Recently active</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {error && <div className="admin-card" style={{ color: '#f87171' }}>{error}</div>}
      {loading ? (
        <div className="admin-card">Loading users…</div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.uid} className="admin-clickable-row" onClick={() => nav(`/admin/users/${u.uid}`)}>
                    <td>
                      <div className="admin-user-cell">
                        {u.photoUrl ? <img className="admin-avatar" src={u.photoUrl} alt="" /> : <div className="admin-avatar" />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{u.name || 'Unnamed'}</div>
                          <div className="muted">{[u.gender, u.college || (u.userType === 'general' ? 'Working' : '')].filter(Boolean).join(' · ') || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{u.email || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{u.phoneNumber || ''}</div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {u.isAdmin && <span className="badge badge-info">Admin</span>}
                        {u.banned && <span className="badge badge-danger">Banned</span>}
                        {premium.has(u.uid) && <span className="badge badge-success">Premium</span>}
                        {!u.isProfileComplete && <span className="badge badge-neutral">Incomplete</span>}
                        {u.isPhoneVerified && <span className="badge badge-neutral">📱</span>}
                        {u.collegeId?.verified && <span className="badge badge-neutral">🎓</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(u.lastLoginAt)}</td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>Page {page + 1} of {pages}</span>
              <button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
