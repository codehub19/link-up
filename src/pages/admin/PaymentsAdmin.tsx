import React, { useEffect, useState } from 'react'
import { collection, getDocs, getFirestore, orderBy, query, where, limit } from 'firebase/firestore'
import { useAuth } from '../../state/AuthContext'
import AdminHeader from '../../components/admin/AdminHeader'

type AdminPayment = {
  id: string
  uid: string
  planId: string
  amount: number
  gateway: string
  status: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  createdAt?: any
  updatedAt?: any
  subscriptionProvisioned?: boolean
}

export default function PaymentsAdmin() {
  const { profile } = useAuth()
  const db = getFirestore()
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.isAdmin) return
    ;(async () => {
      try {
        const q = query(
          collection(db, 'payments'),
            where('gateway', '==', 'razorpay'),
            where('status', '==', 'approved'),
            orderBy('updatedAt', 'desc'),
            limit(100)
        )
        const snap = await getDocs(q)
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
        setPayments(rows)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load payments')
      } finally {
        setLoading(false)
      }
    })()
  }, [db, profile?.isAdmin])

  if (!profile?.isAdmin) {
    return <div style={{ padding: 24 }}>Admin access required.</div>
  }

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <AdminHeader title="Payments" />
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h2 style={{ margin: '0 0 12px' }}>Successful Razorpay Payments</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Read‑only list of approved payments (gateway=razorpay). Legacy manual approvals removed.
        </p>
        {loading && <div style={{ marginTop: 16 }}>Loading...</div>}
        {error && <div className="banner" style={{ marginTop: 16 }}>{error}</div>}
        {!loading && payments.length === 0 && (
          <div style={{ marginTop: 16 }} className="muted">
            No payments found.
          </div>
        )}
        {payments.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount (₹)</th>
                  <th>User UID</th>
                  <th>Razorpay Order</th>
                  <th>Razorpay Payment</th>
                  <th>Provisioned?</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.planId}</td>
                    <td>{p.amount}</td>
                    <td style={{ fontSize: 12 }}>{p.uid}</td>
                    <td style={{ fontSize: 12 }}>{p.razorpayOrderId || '-'}</td>
                    <td style={{ fontSize: 12 }}>{p.razorpayPaymentId || '-'}</td>
                    <td>{p.subscriptionProvisioned ? 'Yes' : 'Pending'}</td>
                    <td style={{ fontSize: 12 }}>
                      {p.updatedAt?.toDate
                        ? p.updatedAt.toDate().toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}