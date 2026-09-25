import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../state/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import {
  AdminUser,
  addSubscriptionMatches,
  deleteUserPermanently,
  formatDate,
  getAdminUser,
  grantSubscription,
  notifyUser,
  resetCallsToday,
  setCollegeVerification,
  setSubscriptionStatus,
  setUserAdmin,
  setUserBan,
  timeAgo,
  toMillis,
  updateUserFields,
} from '../../services/adminTools'

type Tab = 'profile' | 'plans' | 'activity' | 'safety' | 'history'

function Kv({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="admin-kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

const yes = (b: any) => (b ? 'Yes' : 'No')

/** Everything about one user, plus every admin action. */
export default function UserDetailAdmin() {
  const { uid = '' } = useParams()
  const nav = useNavigate()
  const { user: me } = useAuth()
  const { showConfirm, showAlert } = useDialog()

  const [u, setU] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')
  const [busy, setBusy] = useState(false)

  const [subs, setSubs] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [reportsAgainst, setReportsAgainst] = useState<any[]>([])
  const [reportsBy, setReportsBy] = useState<any[]>([])
  const [callStats, setCallStats] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, string>>({})

  // Forms
  const [edit, setEdit] = useState({ name: '', bio: '', instagramId: '', college: '' })
  const [grantPlan, setGrantPlan] = useState('')
  const [grantQuota, setGrantQuota] = useState(1)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const user = await getAdminUser(uid)
      setU(user)
      if (user) setEdit({ name: user.name || '', bio: user.bio || '', instagramId: user.instagramId || '', college: user.college || '' })
      const byUid = (col: string, field: string) => getDocs(query(collection(db, col), where(field, '==', uid)))
        .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))
        .catch(() => [] as any[])
      const [s, p, m, ra, rb, cs, rf, lg, pl] = await Promise.all([
        byUid('subscriptions', 'uid'),
        byUid('payments', 'uid'),
        getDocs(query(collection(db, 'matches'), where('participants', 'array-contains', uid))).then((x) => x.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
        byUid('reports', 'reportedUid'),
        byUid('reports', 'reporterUid'),
        getDoc(doc(db, 'randomCallStats', uid)).then((d) => d.data() || null).catch(() => null),
        byUid('referrals', 'referrerUid'),
        byUid('adminLogs', 'targetUid'),
        getDocs(collection(db, 'plans')).then((x) => x.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
      ])
      const newest = (a: any, b: any) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt)
      setSubs(s.sort(newest)); setPayments(p.sort(newest)); setMatches(m as any[])
      setReportsAgainst(ra.sort(newest)); setReportsBy(rb.sort(newest)); setCallStats(cs)
      setReferrals(rf); setLogs(lg.sort(newest)); setPlans(pl as any[])
      if (!grantPlan && (pl as any[]).length) setGrantPlan((pl as any[])[0].id)

      // Names for matches / reports / log authors
      const others = new Set<string>()
      ;(m as any[]).forEach((x) => (x.participants || []).forEach((p: string) => p !== uid && others.add(p)))
      ra.forEach((r: any) => others.add(r.reporterUid)); rb.forEach((r: any) => others.add(r.reportedUid))
      lg.forEach((l: any) => others.add(l.adminUid))
      const pairs = await Promise.all([...others].filter(Boolean).map(async (o) => {
        const d = await getDoc(doc(db, 'users', o)).catch(() => null)
        return [o, d?.data()?.name || o.slice(0, 8)] as const
      }))
      setNames(Object.fromEntries(pairs))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [uid])

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) await showAlert(ok)
      await load()
    } catch (e: any) {
      await showAlert(e?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !u) return <div className="admin-card">Loading…</div>
  if (!u) return <div className="admin-card">User not found. <Link to="/admin/users">Back to users</Link></div>

  const activeSub = subs.find((s) => s.status === 'active')
  const isSelf = me?.uid === uid
  const images = (u as any).collegeIdImages || u.collegeId
  const photos: string[] = Array.isArray(u.photoUrls) && u.photoUrls.length ? u.photoUrls : (u.photoUrl ? [u.photoUrl] : [])
  const nm = (id: string) => names[id] || id?.slice(0, 8)

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link to="/admin/users" className="btn btn-ghost btn-sm">← All users</Link>
      </div>

      {/* Header */}
      <div className="admin-card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {u.photoUrl ? <img className="admin-avatar admin-avatar-lg" src={u.photoUrl} alt="" /> : <div className="admin-avatar admin-avatar-lg" />}
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: 0 }}>{u.name || 'Unnamed'}</h2>
          <div style={{ color: 'var(--admin-text-muted)', marginTop: 4, fontSize: 14 }}>
            {[u.gender, u.college, u.email].filter(Boolean).join(' · ')}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {u.isAdmin && <span className="badge badge-info">Admin</span>}
            {u.banned && <span className="badge badge-danger">Banned{u.banReason ? `: ${u.banReason}` : ''}</span>}
            {activeSub && <span className="badge badge-success">Premium · {activeSub.remainingMatches ?? 0} matches left</span>}
            {!u.isProfileComplete && <span className="badge badge-neutral">Profile incomplete</span>}
            {u.isPhoneVerified && <span className="badge badge-neutral">Phone verified</span>}
            {u.collegeId?.verified && <span className="badge badge-neutral">College verified</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-sm" href={`/profile/${uid}`} target="_blank" rel="noreferrer">Public profile ↗</a>
          {u.banned ? (
            <button className="btn btn-sm" disabled={busy} onClick={() => run(() => setUserBan(uid, false), 'User unbanned.')}>Unban</button>
          ) : (
            <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} disabled={busy || isSelf}
              onClick={async () => {
                if (await showConfirm(`Ban ${u.name || 'this user'}? They won't be able to call or send messages.`)) {
                  run(() => setUserBan(uid, true, 'Banned by admin'), 'User banned.')
                }
              }}>Ban</button>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        {([['profile', 'Profile'], ['plans', `Plans & payments (${subs.length + payments.length})`], ['activity', `Matches & calls (${matches.length})`], ['safety', `Reports (${reportsAgainst.length})`], ['history', 'Admin actions']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={`admin-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="admin-grid-2">
          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Account</div>
            <Kv rows={[
              ['UID', <code key="uid" style={{ fontSize: 12 }}>{uid}</code>],
              ['Email', u.email],
              ['Phone', u.phoneNumber],
              ['UPI ID', u.upiId],
              ['Joined', formatDate(u.createdAt, true)],
              ['Last active', `${formatDate(u.lastLoginAt, true)} (${timeAgo(u.lastLoginAt)})`],
              ['Profile complete', yes(u.isProfileComplete)],
              ['Phone verified', yes(u.isPhoneVerified)],
              ['Referral code', u.referralCode],
              ['Referred by', u.referredBy],
              ['Referrals made', `${referrals.length} (${referrals.filter((r) => r.hasMatched).length} qualified)`],
              ['Referral paid out', u.referralEarningsPaid ? `₹${u.referralEarningsPaid}` : '—'],
            ]} />
          </div>

          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Dating profile</div>
            <Kv rows={[
              ['Gender', u.gender],
              ['Date of birth', u.dob],
              ['Type', u.userType === 'general' ? 'Working / other' : 'Student'],
              ['College', u.college],
              ['Instagram', u.instagramId ? <a key="ig" href={`https://instagram.com/${u.instagramId}`} target="_blank" rel="noreferrer">@{u.instagramId}</a> : null],
              ['Dating preference', u.datingPreference],
              ['Looking for', u.lookingFor],
              ['Height', u.height],
              ['Interests', Array.isArray(u.interests) ? u.interests.join(', ') : null],
              ['Bio', u.bio],
            ]} />
          </div>

          {photos.length > 0 && (
            <div className="admin-card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Photos</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {photos.map((p) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" style={{ width: 96, height: 120, objectFit: 'cover', borderRadius: 8 }} /></a>)}
              </div>
            </div>
          )}

          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>College ID</div>
            <div style={{ marginBottom: 10, fontSize: 14 }}>
              Status: {u.collegeId?.verified ? '✅ Verified' : u.collegeId?.rejected ? '❌ Rejected' : images?.frontUrl ? '⏳ Pending review' : 'Not submitted'}
            </div>
            {images?.frontUrl && (
              <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                <a href={images.frontUrl} target="_blank" rel="noreferrer"><img src={images.frontUrl} alt="Front" style={{ width: 140, borderRadius: 8 }} /></a>
                {images.backUrl && <a href={images.backUrl} target="_blank" rel="noreferrer"><img src={images.backUrl} alt="Back" style={{ width: 140, borderRadius: 8 }} /></a>}
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-sm" disabled={busy} onClick={() => run(() => setCollegeVerification(uid, true))}>Mark verified</button>
              <button className="btn btn-sm" disabled={busy} onClick={() => run(() => setCollegeVerification(uid, false))}>Reject</button>
            </div>
          </div>

          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Edit profile</div>
            <div className="stack" style={{ gap: 10 }}>
              <div className="admin-field"><label>Name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="admin-field"><label>Instagram</label><input className="input" value={edit.instagramId} onChange={(e) => setEdit({ ...edit, instagramId: e.target.value.replace(/^@/, '') })} /></div>
              <div className="admin-field"><label>College</label><input className="input" value={edit.college} onChange={(e) => setEdit({ ...edit, college: e.target.value })} /></div>
              <div className="admin-field"><label>Bio</label><textarea className="input" rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => updateUserFields(uid, edit), 'Profile updated.')}>Save changes</button>
                {u.photoUrl && (
                  <button className="btn btn-sm" disabled={busy} onClick={async () => {
                    if (await showConfirm('Remove this user\'s main photo? (e.g. for an inappropriate picture)')) run(() => updateUserFields(uid, { photoUrl: null }), 'Photo removed.')
                  }}>Remove main photo</button>
                )}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Send a message</div>
            <div className="stack" style={{ gap: 10 }}>
              <input className="input" placeholder="Title" value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} />
              <textarea className="input" rows={3} placeholder="Message (in-app notification + push)" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} />
              <div>
                <button className="btn btn-primary btn-sm" disabled={busy || !msgTitle.trim() || !msgBody.trim()}
                  onClick={() => run(async () => { await notifyUser(uid, msgTitle.trim(), msgBody.trim()); setMsgTitle(''); setMsgBody('') }, 'Message sent.')}>
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Access & danger zone</div>
            <div className="stack" style={{ gap: 10 }}>
              {u.isAdmin ? (
                <button className="btn btn-sm" disabled={busy || isSelf} onClick={async () => {
                  if (await showConfirm(`Remove admin access from ${u.name}?`)) run(() => setUserAdmin(uid, false))
                }}>{isSelf ? 'You are an admin' : 'Remove admin access'}</button>
              ) : (
                <button className="btn btn-sm" disabled={busy} onClick={async () => {
                  if (await showConfirm(`Give ${u.name} FULL admin access? They will be able to see and change everything.`)) run(() => setUserAdmin(uid, true))
                }}>Make admin</button>
              )}
              <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} disabled={busy || isSelf} onClick={async () => {
                if (!(await showConfirm(`Permanently delete ${u.name || 'this user'}? Their login, profile, private data and photos will be removed. This cannot be undone.`))) return
                if (!(await showConfirm('Are you absolutely sure?'))) return
                setBusy(true)
                try {
                  await deleteUserPermanently(uid)
                  await showAlert('User deleted.')
                  nav('/admin/users')
                } catch (e: any) {
                  await showAlert(e?.message || 'Delete failed')
                } finally {
                  setBusy(false)
                }
              }}>Delete account permanently</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Grant a plan (free)</div>
            <div className="admin-toolbar" style={{ marginBottom: 0 }}>
              <select className="input" value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.audience || 'male'})</option>)}
              </select>
              <input className="input" type="number" min={1} style={{ width: 110 }} value={grantQuota} onChange={(e) => setGrantQuota(Number(e.target.value))} title="Match quota" />
              <button className="btn btn-primary" disabled={busy || !grantPlan} onClick={() => run(() => grantSubscription(uid, grantPlan, Math.max(1, grantQuota), 'Granted from user page'), 'Plan granted.')}>Grant</button>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0 }}>
            <div style={{ fontWeight: 600, padding: '16px 16px 0' }}>Subscriptions</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Plan</th><th>Status</th><th>Matches left</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>{plans.find((p) => p.id === s.planId)?.name || s.planId}{s.grantedByAdmin ? ' · granted' : ''}</td>
                      <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{s.status}</span></td>
                      <td>{s.remainingMatches ?? 0} / {s.matchQuota ?? 0}</td>
                      <td>{formatDate(s.createdAt)}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn btn-sm" disabled={busy} onClick={() => run(() => addSubscriptionMatches(s.id, uid, 1))}>+1 match</button>
                          {s.status === 'active'
                            ? <button className="btn btn-sm" disabled={busy} onClick={() => run(() => setSubscriptionStatus(s.id, uid, 'expired'))}>Expire</button>
                            : <button className="btn btn-sm" disabled={busy} onClick={() => run(() => setSubscriptionStatus(s.id, uid, 'active'))}>Reactivate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!subs.length && <tr><td colSpan={5} style={{ color: 'var(--admin-text-muted)' }}>No subscriptions.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0 }}>
            <div style={{ fontWeight: 600, padding: '16px 16px 0' }}>Payments</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th><th>Proof</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{plans.find((x) => x.id === p.planId)?.name || p.planId}</td>
                      <td>₹{p.amount ?? 0}{p.referralDiscountApplied ? ' · referral' : ''}</td>
                      <td><span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-neutral'}`}>{p.status}</span></td>
                      <td>{formatDate(p.createdAt || p.updatedAt, true)}</td>
                      <td>{p.proofUrl ? <a href={p.proofUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                    </tr>
                  ))}
                  {!payments.length && <tr><td colSpan={5} style={{ color: 'var(--admin-text-muted)' }}>No payments.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="admin-grid-2">
          <div className="admin-card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Random calls</div>
            <Kv rows={[
              ['Calls today', callStats?.day ? `${callStats.calls ?? 0} (on ${callStats.day})` : '0'],
              ['Daily limit', callStats?.dailyLimit ?? 'default'],
              ['Last call with', callStats?.lastPeerUid ? <Link key="lp" to={`/admin/users/${callStats.lastPeerUid}`}>{nm(callStats.lastPeerUid)}</Link> : null],
            ]} />
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-sm" disabled={busy} onClick={() => run(() => resetCallsToday(uid), "Today's call count reset.")}>Reset today's calls</button>
            </div>
          </div>
          <div className="admin-card" style={{ padding: 0 }}>
            <div style={{ fontWeight: 600, padding: '16px 16px 0' }}>Matches</div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>With</th><th>Round</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {matches.map((m) => {
                    const other = (m.participants || []).find((p: string) => p !== uid)
                    return (
                      <tr key={m.id}>
                        <td>{other ? <Link to={`/admin/users/${other}`}>{nm(other)}</Link> : '—'}</td>
                        <td>{m.roundId || '—'}</td>
                        <td>{m.status || 'confirmed'}</td>
                        <td>{formatDate(m.createdAt)}</td>
                      </tr>
                    )
                  })}
                  {!matches.length && <tr><td colSpan={4} style={{ color: 'var(--admin-text-muted)' }}>No matches yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'safety' && (
        <div className="admin-grid-2">
          {[['Reports against this user', reportsAgainst, 'reporterUid', 'By'], ['Reports made by this user', reportsBy, 'reportedUid', 'Against']].map(([title, list, field, label]: any) => (
            <div key={title} className="admin-card" style={{ padding: 0 }}>
              <div style={{ fontWeight: 600, padding: '16px 16px 0' }}>{title} ({list.length})</div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>{label}</th><th>Where</th><th>Reason</th><th>Date</th></tr></thead>
                  <tbody>
                    {list.map((r: any) => (
                      <tr key={r.id}>
                        <td><Link to={`/admin/users/${r[field]}`}>{nm(r[field])}</Link></td>
                        <td>{String(r.threadId || '').startsWith('randomCall_') ? '📞 Call' : '💬 Chat'}</td>
                        <td>{r.reason}</td>
                        <td>{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                    {!list.length && <tr><td colSpan={4} style={{ color: 'var(--admin-text-muted)' }}>None.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.createdAt, true)}</td>
                    <td>{nm(l.adminUid)}</td>
                    <td>{String(l.action).replace(/_/g, ' ')}</td>
                    <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '—'}</td>
                  </tr>
                ))}
                {!logs.length && <tr><td colSpan={4} style={{ color: 'var(--admin-text-muted)' }}>No admin actions on this user yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
