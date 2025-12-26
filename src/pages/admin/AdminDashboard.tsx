import React, { useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { ref, onValue } from 'firebase/database'
import { db, rtdb } from '../../firebase'
import { listPendingPayments } from '../../services/payments'
import { getActiveRound } from '../../services/rounds'
import { Users, TrendingUp, AlertCircle, CreditCard, Activity } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        males: 0,
        females: 0,
        pendingPayments: 0,
        activeRoundId: 'None'
    })

    const [recentUsers, setRecentUsers] = useState<any[]>([])
    const [onlineCount, setOnlineCount] = useState(0)

    useEffect(() => {
        // ... (existing loadStats logic for Firestore) ...
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

            // Recent Users (Active)
            try {
                // query users ordered by lastLoginAt desc
                const q = query(userColl, orderBy('lastLoginAt', 'desc'), limit(5));
                const snap = await getDocs(q);
                const users = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        uid: d.id,
                        name: data.name || 'Unknown',
                        email: data.email,
                        photoUrl: data.photoUrl,
                        lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(),
                    }
                });
                setRecentUsers(users);
            } catch (e) {
                console.warn('Failed to load recent users', e);
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

        // RTDB Presence Listener
        const statusRef = ref(rtdb, 'status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            let count = 0;
            snapshot.forEach((child) => {
                const val = child.val();
                if (val && val.state === 'online') {
                    count++;
                }
            });
            setOnlineCount(count);
        });

        return () => unsubscribe();
    }, [])

    // Helper to format time ago
    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " min ago" : " mins ago");
        return "Just now";
    }

    return (
        <div>
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
                            <div className="stat-label">Online Now</div>
                            <div className="stat-value">{onlineCount}</div>
                            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                Real-time active users
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(168, 85, 247, 0.1)', borderRadius: 8, color: '#a855f7' }}>
                            <Activity size={20} />
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
            {/* Recent Activity & Quick Actions */}
            <div className="row stack-mobile" style={{ gap: 24, flexWrap: 'wrap' }}>
                <div className="admin-card" style={{ flex: 2 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 16 }}>Recently Active Users</h3>
                    <div className="stack" style={{ gap: 12 }}>
                        {recentUsers.length === 0 ? (
                            <p style={{ color: 'var(--admin-text-muted)' }}>No recent activity.</p>
                        ) : (
                            recentUsers.map(u => (
                                <div key={u.uid} className="row" style={{ alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--admin-border)' }}>
                                    <div className="row" style={{ gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                        <div className="avatar" style={{ width: 40, height: 40, borderRadius: 999, overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                                            {u.photoUrl && <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <div className="row" style={{ alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 50, background: '#22c55e' }}></div>
                                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{timeAgo(u.lastLoginAt)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="admin-card" style={{ flex: 1 }}>
                    <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
                    <div className="stack" style={{ gap: 10 }}>
                        {/* Using a href here for simplicity, or Link if I import it */}
                        <a href="/admin/rounds" className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }}>Manage Rounds</a>
                        <a href="/admin/curation" className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }}>Curate Matches</a>
                        <a href="/admin/payments" className="btn btn-ghost" style={{ justifyContent: 'flex-start', width: '100%' }}>Verify Payments</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
