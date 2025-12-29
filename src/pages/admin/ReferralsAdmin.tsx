
import React, { useEffect, useState } from 'react'
import AdminHeader from './AdminHome'
import { listPendingClaims, approveClaim, rejectClaim, ReferralClaim } from '../../services/referrals'
import { toast } from 'sonner'
import { useAuth } from '../../state/AuthContext'

export default function ReferralsAdmin() {
    const { user } = useAuth()
    const [claims, setClaims] = useState<ReferralClaim[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        setLoading(true)
        try {
            const data = await listPendingClaims()
            // Order by oldest first
            data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
            setClaims(data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleApprove = async (claim: ReferralClaim) => {
        if (!user || !claim.id) return
        if (!confirm('Mark this claim as PAID? Ensure you have transferred the money.')) return

        try {
            await approveClaim(claim.id, user.uid)
            toast.success('Claim approved')
            refresh()
        } catch (e) {
            console.error(e)
            toast.error('Failed to approve')
        }
    }

    const handleReject = async (claim: ReferralClaim) => {
        if (!claim.id) return
        const reason = prompt('Reason for rejection:')
        if (!reason) return

        try {
            await rejectClaim(claim.id, reason)
            toast.success('Claim rejected')
            refresh()
        } catch (e) {
            console.error(e)
            toast.error('Failed to reject')
        }
    }

    const [inspecting, setInspecting] = useState<{ claim: ReferralClaim, referrals: any[] } | null>(null)

    const handleInspect = async (claim: ReferralClaim) => {
        try {
            const { getReferralStats } = await import('../../services/referrals')
            const stats = await getReferralStats(claim.uid)
            setInspecting({ claim, referrals: stats.referrals })
        } catch (e) {
            console.error(e)
            toast.error('Failed to load referral details')
        }
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
            <AdminHeader current="referrals" title="Referral Claims" />

            {loading ? <div>Loading...</div> : claims.length === 0 ? (
                <div style={{ padding: 40, border: '1px dashed #ccc', textAlign: 'center', borderRadius: 8 }}>
                    No pending claims.
                </div>
            ) : (
                <div className="admin-card">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Claim ID</th>
                                    <th>User UID</th>
                                    <th>UPI ID</th>
                                    <th>Amount</th>
                                    <th>Requested At</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>{(c.id || '').substring(0, 8)}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{c.uid}</td>
                                        <td style={{ fontWeight: 600 }}>{c.upiId}</td>
                                        <td style={{ color: '#16a34a', fontWeight: 'bold' }}>₹{c.amount}</td>
                                        <td style={{ color: 'var(--admin-text-muted)' }}>{c.createdAt?.toDate?.().toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => handleInspect(c)}
                                                    className="btn btn-primary btn-sm"
                                                    style={{ background: 'var(--admin-primary)' }}
                                                >
                                                    Inspect
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(c)}
                                                    className="btn btn-primary btn-sm"
                                                    style={{ background: '#10b981', boxShadow: 'none' }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(c)}
                                                    className="btn btn-primary btn-sm"
                                                    style={{ background: '#ef4444', boxShadow: 'none' }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Inspection Modal */}
            {inspecting && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setInspecting(null)}>
                    <div className="admin-card" style={{ width: 700, maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto', margin: 0, border: '1px solid var(--admin-primary)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--admin-border)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--admin-text-main)' }}>Referral Breakdown</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--admin-text-muted)', fontSize: 13, fontFamily: 'monospace' }}>User: {inspecting.claim.uid}</p>
                            </div>
                            <button onClick={() => setInspecting(null)} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: 'var(--admin-text-muted)' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Claim Amount</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-primary)' }}>₹{inspecting.claim.amount}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>UPI ID</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{inspecting.claim.upiId}</div>
                            </div>
                        </div>

                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Referee Name</th>
                                        <th>UID</th>
                                        <th>Status</th>
                                        <th>Has Matched?</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inspecting.referrals.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{r.refereeName || 'Unknown'}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>{(r.refereeUid || '').substring(0, 6)}...</td>
                                            <td>
                                                <span className={r.status === 'qualified' ? 'badge badge-success' : 'badge badge-neutral'}>
                                                    {r.status || 'pending'}
                                                </span>
                                            </td>
                                            <td>
                                                {r.hasMatched ? (
                                                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ fontSize: 16 }}>✓</span> Yes
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--admin-text-muted)' }}>No</span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--admin-text-muted)' }}>{r.createdAt?.toDate?.().toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {inspecting.referrals.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No referrals found for this user.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--admin-border)' }}>
                            <button className="btn btn-ghost" onClick={() => setInspecting(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
