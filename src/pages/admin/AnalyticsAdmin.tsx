import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import BarChart, { BarDatum } from '../../components/admin/BarChart'
import { toMillis } from '../../services/adminTools'

type Range = 7 | 30 | 90

const DAY = 86_400_000

function compact(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}
const rupees = (n: number) => `₹${compact(Math.round(n))}`

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="admin-card" style={{ marginBottom: 0 }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/** Growth, engagement, revenue and calls, computed from Firestore. */
export default function AnalyticsAdmin() {
  const [range, setRange] = useState<Range>(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState<{ users: any[]; payments: any[]; subs: any[]; calls: any[]; matches: any[]; reports: any[] }>(
    { users: [], payments: [], subs: [], calls: [], matches: [], reports: [] })

  useEffect(() => {
    const all = (c: string) => getDocs(collection(db, c)).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => [] as any[])
    Promise.all([all('users'), all('payments'), all('subscriptions'), all('randomCalls'), all('matches'), all('reports')])
      .then(([users, payments, subs, calls, matches, reports]) => setRaw({ users, payments, subs, calls, matches, reports }))
      .catch((e) => setError(e?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  const a = useMemo(() => {
    const now = Date.now()
    const start = now - range * DAY
    const inRange = (t: any) => toMillis(t) >= start

    // Daily buckets (local dates) for the selected range
    const days: { key: string; label: string }[] = []
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY)
      days.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })
    }
    const bucket = <T,>(items: T[], getTime: (x: T) => any, getValue: (x: T) => number = () => 1): BarDatum[] => {
      const m = new Map<string, number>()
      items.forEach((x) => {
        const ms = toMillis(getTime(x))
        if (ms < start) return
        const k = new Date(ms).toDateString()
        m.set(k, (m.get(k) || 0) + getValue(x))
      })
      return days.map((d) => ({ label: d.label, value: m.get(d.key) || 0 }))
    }

    const { users, payments, subs, calls, matches, reports } = raw
    const approved = payments.filter((p) => p.status === 'approved')
    const payTime = (p: any) => p.updatedAt || p.createdAt
    const randomCalls = calls.filter((c) => c.type !== 'match')
    const connectedCalls = randomCalls.filter((c) => c.startedAt || c.status === 'active' || c.decisions && Object.keys(c.decisions).length)
    const durations = calls
      .filter((c) => inRange(c.createdAt) && c.startedAt && c.endedAt)
      .map((c) => (toMillis(c.endedAt) - toMillis(c.startedAt)) / 1000)
      .filter((s) => s > 0 && s < 4 * 3600)

    const matchedUids = new Set(matches.flatMap((m) => m.participants || []))
    const paidUids = new Set(approved.map((p) => p.uid))
    const activeSubs = subs.filter((s) => s.status === 'active')

    const colleges = new Map<string, number>()
    users.forEach((u) => { if (u.college) colleges.set(u.college, (colleges.get(u.college) || 0) + 1) })

    return {
      totalUsers: users.length,
      newUsers: users.filter((u) => inRange(u.createdAt)).length,
      active24h: users.filter((u) => toMillis(u.lastLoginAt) >= now - DAY).length,
      active7d: users.filter((u) => toMillis(u.lastLoginAt) >= now - 7 * DAY).length,
      men: users.filter((u) => u.gender === 'male').length,
      women: users.filter((u) => u.gender === 'female').length,
      premium: activeSubs.length,
      revenue: approved.filter((p) => inRange(payTime(p))).reduce((s, p) => s + Number(p.amount || 0), 0),
      revenueAll: approved.reduce((s, p) => s + Number(p.amount || 0), 0),
      pendingPayments: payments.filter((p) => p.status === 'pending').length,
      calls: randomCalls.filter((c) => inRange(c.createdAt)).length,
      matchCalls: calls.filter((c) => c.type === 'match' && inRange(c.createdAt)).length,
      connections: randomCalls.filter((c) => c.connected && inRange(c.createdAt)).length,
      connectRate: (() => {
        const decided = connectedCalls.filter((c) => inRange(c.createdAt) && c.decisions && Object.keys(c.decisions).length === 2)
        return decided.length ? Math.round((decided.filter((c) => c.connected).length / decided.length) * 100) : null
      })(),
      avgCallSec: durations.length ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : null,
      reports: reports.filter((r) => inRange(r.createdAt)).length,
      newMatches: matches.filter((m) => inRange(m.createdAt)).length,
      signupsDaily: bucket(users, (u) => u.createdAt),
      revenueDaily: bucket(approved, payTime, (p) => Number(p.amount || 0)),
      callsDaily: bucket(randomCalls, (c) => c.createdAt),
      funnel: [
        { label: 'Signed up', value: users.length },
        { label: 'Profile complete', value: users.filter((u) => u.isProfileComplete).length },
        { label: 'Phone verified', value: users.filter((u) => u.isPhoneVerified).length },
        { label: 'Got a match', value: users.filter((u) => matchedUids.has(u.id)).length },
        { label: 'Paid', value: users.filter((u) => paidUids.has(u.id)).length },
      ] as BarDatum[],
      topColleges: [...colleges.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10),
    }
  }, [raw, range])

  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Analytics</h2>
          <div className="admin-page-sub">Growth, engagement, revenue and calls</div>
        </div>
      </div>

      {/* One filter row, above everything it scopes */}
      <div className="admin-toolbar">
        {([7, 30, 90] as Range[]).map((r) => (
          <button key={r} className={`btn btn-sm ${range === r ? 'btn-primary' : ''}`} onClick={() => setRange(r)}>Last {r} days</button>
        ))}
      </div>

      {error && <div className="admin-card" style={{ color: '#f87171' }}>{error}</div>}
      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        <div className="admin-grid-4">
          <Tile label="Total users" value={compact(a.totalUsers)} sub={`${a.men} men · ${a.women} women`} />
          <Tile label={`New sign-ups (${range}d)`} value={compact(a.newUsers)} />
          <Tile label="Active users" value={compact(a.active24h)} sub={`last 24h · ${compact(a.active7d)} in 7 days`} />
          <Tile label="Premium (active plans)" value={compact(a.premium)} sub={pct(a.premium, a.totalUsers) + ' of users'} />
          <Tile label={`Revenue (${range}d)`} value={rupees(a.revenue)} sub={`${rupees(a.revenueAll)} all time · ${a.pendingPayments} pending`} />
          <Tile label={`Random calls (${range}d)`} value={compact(a.calls)} sub={`${a.matchCalls} calls between matches`} />
          <Tile label="Call → connection" value={a.connectRate == null ? '—' : `${a.connectRate}%`} sub={`${a.connections} mutual likes · avg call ${a.avgCallSec == null ? '—' : `${Math.floor(a.avgCallSec / 60)}m ${a.avgCallSec % 60}s`}`} />
          <Tile label={`Reports (${range}d)`} value={compact(a.reports)} sub={`${a.newMatches} new round matches`} />
        </div>

        <div className="admin-grid-2">
          <BarChart title="New sign-ups per day" data={a.signupsDaily} />
          <BarChart title="Revenue per day" subtitle="Approved payments" data={a.revenueDaily} formatValue={rupees} />
          <BarChart title="Random calls per day" data={a.callsDaily} />
          <BarChart title="User funnel" subtitle="All time, each stage out of everyone who signed up" data={a.funnel.map((f) => ({ ...f, hint: pct(f.value, a.totalUsers) }))} horizontal />
        </div>

        <div className="admin-card" style={{ padding: 0, marginTop: 16 }}>
          <div style={{ fontWeight: 600, padding: '16px 16px 0' }}>Top colleges</div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>College</th><th style={{ textAlign: 'right' }}>Users</th></tr></thead>
              <tbody>
                {a.topColleges.map(([c, n]) => <tr key={c}><td>{c}</td><td style={{ textAlign: 'right' }}>{n}</td></tr>)}
                {!a.topColleges.length && <tr><td colSpan={2} style={{ color: 'var(--admin-text-muted)' }}>No data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
