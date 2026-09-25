import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getCountFromServer, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import type { AppConfig } from '../../services/adminTools'

type Item = { label: string; count: number | null; href: string; tone: 'warning' | 'neutral' }

/** Work waiting for an admin, plus the live site status, at the top of the dashboard. */
export default function AdminAttention() {
  const [items, setItems] = useState<Item[]>([])
  const [cfg, setCfg] = useState<AppConfig & { callsEnabled?: boolean }>({})

  useEffect(() => {
    const count = (col: string, field: string, value: any) =>
      getCountFromServer(query(collection(db, col), where(field, '==', value))).then((s) => s.data().count).catch(() => null)

    Promise.all([
      getDocs(collection(db, 'reports')).then((s) => s.docs.filter((d) => d.data().status !== 'resolved').length).catch(() => null),
      count('payments', 'status', 'pending'),
      getDocs(query(collection(db, 'users'), where('collegeId.verified', '==', false)))
        .then((s) => s.docs.filter((d) => !d.data().collegeId?.rejected && (d.data().collegeId?.submitted || d.data().collegeId?.frontUrl)).length)
        .catch(() => null),
      count('account_delete_requests', 'status', 'pending'),
      count('support_queries', 'status', 'pending'),
      count('referral_claims', 'status', 'pending'),
    ]).then(([reports, payments, ids, deletes, support, claims]) => setItems([
      { label: 'Open reports', count: reports, href: '/admin/reports', tone: 'warning' },
      { label: 'Pending payments', count: payments, href: '/admin/payments', tone: 'warning' },
      { label: 'College IDs to review', count: ids, href: '/admin/college-id-verification', tone: 'neutral' },
      { label: 'Account deletion requests', count: deletes, href: '/admin/requests', tone: 'neutral' },
      { label: 'Support queries', count: support, href: '/admin/requests', tone: 'neutral' },
      { label: 'Referral payout claims', count: claims, href: '/admin/referrals', tone: 'neutral' },
    ]))

    Promise.all([getDoc(doc(db, 'config', 'app')), getDoc(doc(db, 'config', 'randomCall'))]).then(([a, c]) => {
      setCfg({ ...(a.data() || {}), callsEnabled: c.data()?.enabled !== false })
    }).catch(() => { })
  }, [])

  return (
    <>
      <div className="admin-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${cfg.maintenanceMode ? 'badge-danger' : 'badge-success'}`}>{cfg.maintenanceMode ? 'Maintenance mode ON' : 'Site live'}</span>
          <span className={`badge ${cfg.signupsPaused ? 'badge-warning' : 'badge-success'}`}>{cfg.signupsPaused ? 'Sign-ups paused' : 'Sign-ups open'}</span>
          <span className={`badge ${cfg.callsEnabled ? 'badge-success' : 'badge-warning'}`}>{cfg.callsEnabled ? 'Random calls on' : 'Random calls off'}</span>
          {cfg.announcement?.active && <span className="badge badge-info">Banner: {cfg.announcement.text}</span>}
        </div>
        <Link to="/admin/controls" className="btn btn-sm">App controls</Link>
      </div>

      <div className="admin-grid-4">
        {items.map((it) => (
          <Link key={it.label} to={it.href} className="admin-card" style={{ marginBottom: 0, textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-label">{it.label}</div>
            <div className="stat-value" style={{ color: it.tone === 'warning' && it.count ? '#fbbf24' : undefined }}>
              {it.count == null ? '—' : it.count}
            </div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{it.count ? 'Review →' : 'All clear'}</div>
          </Link>
        ))}
      </div>
    </>
  )
}
