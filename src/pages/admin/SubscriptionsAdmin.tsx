import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'
import { addSubscriptionMatches, downloadCsv, formatDate, grantSubscription, setSubscriptionStatus, toMillis } from '../../services/adminTools'

/** All plans people hold, with grant / extend / expire. */
export default function SubscriptionsAdmin() {
  const { showAlert, showConfirm } = useDialog()
  const [subs, setSubs] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'active' | 'expired' | 'all'>('active')
  const [planFilter, setPlanFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Grant form
  const [grantUid, setGrantUid] = useState('')
  const [grantPlan, setGrantPlan] = useState('')
  const [grantQuota, setGrantQuota] = useState(1)

  const load = async () => {
    setLoading(true)
    const [s, p] = await Promise.all([getDocs(collection(db, 'subscriptions')), getDocs(collection(db, 'plans'))])
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() } as any)).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    setSubs(list)
    const pl = p.docs.map((d) => ({ id: d.id, ...d.data() }))
    setPlans(pl)
    if (!grantPlan && pl.length) setGrantPlan(pl[0].id)
    const uids = [...new Set(list.map((x) => x.uid))].filter((u) => !names[u])
    const pairs = await Promise.all(uids.map(async (u) => [u, (await getDoc(doc(db, 'users', u)).catch(() => null))?.data()?.name || u.slice(0, 8)] as const))
    setNames((prev) => ({ ...prev, ...Object.fromEntries(pairs) }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const planName = (id: string) => plans.find((p) => p.id === id)?.name || id
  const shown = useMemo(() => subs.filter((s) =>
    (status === 'all' || s.status === status)
    && (planFilter === 'all' || s.planId === planFilter)
    && (!search.trim() || (names[s.uid] || '').toLowerCase().includes(search.toLowerCase()) || s.uid.includes(search.trim()))
  ), [subs, status, planFilter, search, names])

  const act = async (fn: () => Promise<any>) => {
    setBusy(true)
    try { await fn(); await load() } catch (e: any) { await showAlert(e?.message || 'Failed') } finally { setBusy(false) }
  }

  const activeCount = subs.filter((s) => s.status === 'active').length

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Subscriptions</h2>
          <div className="admin-page-sub">{activeCount} active · {subs.length} total</div>
        </div>
        <button className="btn" disabled={!shown.length} onClick={() => downloadCsv('dateu-subscriptions.csv', shown.map((s) => ({
          user: names[s.uid] || s.uid, uid: s.uid, plan: planName(s.planId), status: s.status,
          remainingMatches: s.remainingMatches ?? 0, matchQuota: s.matchQuota ?? 0, granted: !!s.grantedByAdmin, created: formatDate(s.createdAt),
        })))}>Export CSV</button>
      </div>

      <div className="admin-card">
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Grant a plan for free</div>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <input className="input grow" placeholder="User UID (copy it from the Users page)" value={grantUid} onChange={(e) => setGrantUid(e.target.value.trim())} />
          <select className="input" value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" type="number" min={1} style={{ width: 100 }} value={grantQuota} onChange={(e) => setGrantQuota(Number(e.target.value))} title="Match quota" />
          <button className="btn btn-primary" disabled={busy || !grantUid || !grantPlan} onClick={() => act(async () => {
            const u = await getDoc(doc(db, 'users', grantUid))
            if (!u.exists()) throw new Error('No user with that UID')
            if (!(await showConfirm(`Give ${u.data().name || grantUid} the ${planName(grantPlan)} plan for free?`))) return
            await grantSubscription(grantUid, grantPlan, Math.max(1, grantQuota), 'Granted from Subscriptions')
            setGrantUid('')
          })}>Grant</button>
        </div>
      </div>

      <div className="admin-toolbar">
        <input className="input grow" placeholder="Search by name or UID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="all">All</option>
        </select>
        <select className="input" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="admin-card" style={{ padding: 0, opacity: loading ? 0.5 : 1 }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Matches left</th><th>Rounds</th><th>Since</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/admin/users/${s.uid}`}>{names[s.uid] || s.uid.slice(0, 8)}</Link></td>
                  <td>{planName(s.planId)}{s.grantedByAdmin ? <span className="badge badge-neutral" style={{ marginLeft: 6 }}>granted</span> : null}</td>
                  <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{s.status}</span></td>
                  <td>{s.remainingMatches ?? 0} / {s.matchQuota ?? 0}</td>
                  <td>{s.roundsUsed ?? 0} / {s.roundsAllowed ?? 1}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-sm" disabled={busy} onClick={() => act(() => addSubscriptionMatches(s.id, s.uid, 1))}>+1 match</button>
                      {s.status === 'active'
                        ? <button className="btn btn-sm" disabled={busy} onClick={() => act(() => setSubscriptionStatus(s.id, s.uid, 'expired'))}>Expire</button>
                        : <button className="btn btn-sm" disabled={busy} onClick={() => act(() => setSubscriptionStatus(s.id, s.uid, 'active'))}>Reactivate</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} style={{ color: 'var(--admin-text-muted)' }}>{loading ? 'Loading…' : 'No subscriptions match.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
