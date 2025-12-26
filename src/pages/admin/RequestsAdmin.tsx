import React, { useEffect, useState } from 'react'
import AdminHeader from './AdminHome'
import {
    fetchDeleteRequests, approveDeleteRequest, rejectDeleteRequest,
    fetchReports, resolveReport, dismissReport,
    DeleteRequest, Report
} from '../../services/adminRequests'
import { useDialog } from '../../components/ui/Dialog'
import LoadingSpinner from '../../components/LoadingSpinner'

// Simple helper for dates
const formatDate = (ts: any) => {
    if (!ts) return '-'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString()
}

export default function RequestsAdmin() {
    const { showAlert, showConfirm } = useDialog()
    const [activeTab, setActiveTab] = useState<'delete' | 'reports'>('delete')

    const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([])
    const [reports, setReports] = useState<Report[]>([])

    const [loading, setLoading] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'delete') {
                const data = await fetchDeleteRequests()
                setDeleteRequests(data)
            } else {
                const data = await fetchReports()
                // Filter out resolved/dismissed on client side for now if needed, 
                // or just show them with status.
                // Let's show only open ones by default or sort by status.
                // For now, simple list.
                setReports(data)
            }
        } catch (e) {
            console.error(e)
            showAlert('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [activeTab])

    // --- Handlers: Delete Requests ---

    const handleApproveDelete = async (req: DeleteRequest) => {
        if (await showConfirm(`PERMANENTLY DELETE user ${req.email || req.uid}? This cannot be undone.`)) {
            try {
                await approveDeleteRequest(req.uid)
                await showAlert('User deleted and request approved.')
                loadData()
            } catch (e) {
                console.error(e)
                showAlert('Failed to approve request')
            }
        }
    }

    const handleRejectDelete = async (req: DeleteRequest) => {
        if (await showConfirm('Reject this deletion request?')) {
            try {
                await rejectDeleteRequest(req.uid)
                loadData()
            } catch (e) {
                console.error(e)
                showAlert('Failed to reject request')
            }
        }
    }

    // --- Handlers: Reports ---

    const handleResolveReport = async (r: Report) => {
        if (await showConfirm('Mark report as RESOLVED?')) {
            try {
                await resolveReport(r.id)
                loadData()
            } catch (e) {
                console.error(e)
                showAlert('Failed to resolve report')
            }
        }
    }

    const handleDismissReport = async (r: Report) => {
        if (await showConfirm('Dismiss this report?')) {
            try {
                await dismissReport(r.id)
                loadData()
            } catch (e) {
                console.error(e)
                showAlert('Failed to dismiss report')
            }
        }
    }

    return (
        <div className="admin-page fade-in">
            <AdminHeader title="Requests & Reports" current="requests" />

            <div className="admin-content">

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid #eee' }}>
                    <button
                        className={`tab-btn ${activeTab === 'delete' ? 'active' : ''}`}
                        onClick={() => setActiveTab('delete')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'delete' ? '2px solid #222' : 'none',
                            fontWeight: activeTab === 'delete' ? 600 : 400,
                            cursor: 'pointer'
                        }}
                    >
                        Delete Requests
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'reports' ? '2px solid #222' : 'none',
                            fontWeight: activeTab === 'reports' ? 600 : 400,
                            cursor: 'pointer'
                        }}
                    >
                        User Reports
                    </button>
                </div>

                {loading ? <LoadingSpinner /> : (
                    <>
                        {/* Delete Requests Table */}
                        {activeTab === 'delete' && (
                            <div className="admin-card">
                                <h3>Account Deletion Requests</h3>
                                {deleteRequests.length === 0 ? (
                                    <p style={{ color: '#666' }}>No pending requests.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Requested</th>
                                                    <th>User</th>
                                                    <th>Reason</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deleteRequests.map(d => (
                                                    <tr key={d.uid}>
                                                        <td>{formatDate(d.requestedAt)}</td>
                                                        <td>
                                                            <div>{d.email || 'No Email'}</div>
                                                            <div style={{ fontSize: 11, color: '#888' }}>{d.uid}</div>
                                                        </td>
                                                        <td>{d.reason}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <button
                                                                    className="btn-xs danger"
                                                                    onClick={() => handleApproveDelete(d)}
                                                                    title="Delete Account"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="btn-xs secondary"
                                                                    onClick={() => handleRejectDelete(d)}
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
                                )}
                            </div>
                        )}

                        {/* Reports Table */}
                        {activeTab === 'reports' && (
                            <div className="admin-card">
                                <h3>User Reports</h3>
                                {reports.length === 0 ? (
                                    <p style={{ color: '#666' }}>No reports found.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Reporter</th>
                                                    <th>Reported User</th>
                                                    <th>Reason</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reports.map(r => (
                                                    <tr key={r.id}>
                                                        <td>{formatDate(r.createdAt)}</td>
                                                        <td><span style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.reporterUid}</span></td>
                                                        <td><span style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.reportedUid}</span></td>
                                                        <td>{r.reason}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                background: r.status === 'resolved' ? '#dcfce7' : r.status === 'dismissed' ? '#f3f4f6' : '#fff7ed',
                                                                color: r.status === 'resolved' ? '#166534' : r.status === 'dismissed' ? '#374151' : '#9a3412'
                                                            }}>
                                                                {r.status || 'Open'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {(!r.status || r.status === 'open') && (
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <button
                                                                        className="btn-xs primary"
                                                                        onClick={() => handleResolveReport(r)}
                                                                    >
                                                                        Resolve
                                                                    </button>
                                                                    <button
                                                                        className="btn-xs secondary"
                                                                        onClick={() => handleDismissReport(r)}
                                                                    >
                                                                        Dismiss
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
