import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listPendingPayments } from '../../services/payments'

type Props = { current?: 'home' | 'rounds' | 'payments' | 'curation' | 'plans' }

export default function AdminHeader({ current }: Props) {
  const loc = useLocation()
  const [pendingCount, setPendingCount] = useState<number>(0)

  useEffect(() => {
    // lightweight count for badge
    listPendingPayments().then((rows) => setPendingCount(rows.length)).catch(() => setPendingCount(0))
  }, [loc.pathname])

  const Item = (p: { to: string; label: string; id: Props['current'] }) => (
    <Link className={`btn ${current === p.id ? 'btn-primary' : 'btn-ghost'}`} to={p.to} style={{ position: 'relative' }}>
      {p.label}
      {p.id === 'payments' && pendingCount > 0 ? (
        <span className="tag" style={{ position: 'absolute', top: -10, right: -10 }}>{pendingCount}</span>
      ) : null}
    </Link>
  )

  return (
    <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <Item to="/admin" label="Home" id="home" />
      <Item to="/admin/rounds" label="Rounds" id="rounds" />
      <Item to="/admin/payments" label="Payments" id="payments" />
      <Item to="/admin/curation" label="Curation" id="curation" />
      <Item to="/admin/plans" label="Plans" id="plans" />
    </div>
  )
}