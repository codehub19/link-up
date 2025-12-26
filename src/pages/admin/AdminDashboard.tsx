import React, { useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { listPendingPayments } from '../../services/payments'
import { getActiveRound } from '../../services/rounds'
import { Users, TrendingUp, AlertCircle, CreditCard } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        males: 0,
        females: 0,
        pendingPayments: 0,
        activeRoundId: 'None'
    })

    useEffect(() => {
        async function loadStats() {
            // User counts
            const userColl = collection(db, 'users')
            const totalSnapshot = await getCountFromServer(userColl)
            const maleSnapshot = await getCountFromServer(query(userColl, where('gender', '==', 'male')))
            const femaleSnapshot = await getCountFromServer(query(userColl, where('gender', '==', 'female')))

            // Pending payments
            let pendingCount = 0
            try {
                const p = await listPendingPayments()
                pendingCount = p.length
            } catch (e) {
                console.warn('Failed to load pending payments', e)
            }

            // Active round
            let roundId = 'None'
            try {
                const r = await getActiveRound()
                if (r) roundId = r.id
            } catch (e) {
                console.warn('Failed to load active round', e)
            }

            setStats({
                users: totalSnapshot.data().count,
                males: maleSnapshot.data().count,
                females: femaleSnapshot.data().count,
                pendingPayments: pendingCount,
                activeRoundId: roundId
            })
        }
        loadStats()
    }, [])

    return (
        <div className="container">
            <h2 style={{ marginBottom: 24 }}>Dashboard Overview</h2>

            <div className="admin-stat-grid">
                <div className="admin-card">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Total Users</div>
                            <div className="stat-value">{stats.users}</div>
                            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                {stats.males} Males • {stats.females} Females
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, color: '#60a5fa' }}>
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div>
                            <div className="stat-label">Pending Payments</div>
                            <div className="stat-value">{stats.pendingPayments}</div>
                            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                Requires action
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(249, 115, 22, 0.1)', borderRadius: 8, color: '#fb923c' }}>
                            <CreditCard size={20} />
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div>
                            <div className="stat-label">Active Round</div>
                            <div className="stat-value" style={{ fontSize: 20, lineHeight: '34px' }}>{stats.activeRoundId}</div>
                            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                Current matching cycle
                            </div>
                        </div>
                        <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 8, color: '#16a34a' }}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
                <div className="admin-card" style={{ flex: 2 }}>
                    <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
                    <p style={{ color: 'var(--admin-text-muted)' }}>Activity log implementation coming soon...</p>
                </div>

                <div className="admin-card" style={{ flex: 1 }}>
                    <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
                    <div className="stack" style={{ gap: 10 }}>
                        {/* Using a href here for simplicity, or Link if I import it */}
                        <a href="/admin/rounds" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Manage Rounds</a>
                        <a href="/admin/curation" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Curate Matches</a>
                        <a href="/admin/payments" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Verify Payments</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
