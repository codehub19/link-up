import React, { useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { listPendingPayments, Payment } from '../../services/payments'
import AdminHeader from '../../components/admin/AdminHeader'

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const [pending, setPending] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = !!profile?.isAdmin

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    listPendingPayments()
      .then(rows => setPending(rows))
      .catch(() => setPending([]))
      .finally(() => setLoading(false))
  }, [isAdmin])

  if (!isAdmin) {
    return <div style={{ padding: 24 }}>Access denied.</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <AdminHeader title="Payments" />
      {loading && <p>Loading pending payments...</p>}
      {!loading && pending.length === 0 && (
        <p>No pending payments 🎉</p>
      )}
      {!loading && pending.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">User</th>
              <th align="left">Plan</th>
              <th align="right">Amount</th>
              <th align="left">Status</th>
              <th align="left">Created</th>
            </tr>
          </thead>
            <tbody>
              {pending.map(p => (
                <tr key={p.id}>
                  <td>{p.uid}</td>
                  <td>{p.planId}</td>
                  <td style={{ textAlign: 'right' }}>₹{p.amount}</td>
                  <td>{p.status}</td>
                  <td>{p.createdAt?.toDate?.().toLocaleString?.() || '-'}</td>
                </tr>
              ))}
            </tbody>
        </table>
      )}
    </div>
  )
}