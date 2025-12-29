
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import HomeBackground from '../../components/home/HomeBackground'
import { useAuth } from '../../state/AuthContext'
import { listUserQueries, SupportQuery } from '../../services/support'

export default function SupportHistoryPage() {
    const { profile } = useAuth()
    const nav = useNavigate()
    const [queries, setQueries] = useState<SupportQuery[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null)

    useEffect(() => {
        if (profile?.uid) {
            listUserQueries(profile.uid)
                .then(setQueries)
                .finally(() => setLoading(false))
        }
    }, [profile?.uid])

    return (
        <>
            <HomeBackground />
            <Navbar />
            <div className="dashboard-container" style={{ paddingTop: 100 }}>
                <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 24 }}>
                            &larr;
                        </button>
                        <h1 style={{ margin: 0, fontSize: 24 }}>Support History</h1>
                    </div>

                    {loading ? (
                        <div>Loading...</div>
                    ) : queries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
                            No support queries found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {queries.map(q => (
                                <div key={q.id} style={{ background: '#1a1a1a', padding: 20, borderRadius: 12, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.category}</div>
                                        <div style={{ fontSize: 13, color: '#aaa' }}>{q.createdAt?.toDate?.().toLocaleString()}</div>
                                        <div style={{ marginTop: 8 }}>
                                            <span className={`badge badge-${q.status === 'resolved' ? 'success' : 'warning'}`}>{q.status}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedQuery(q)}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13
                                        }}
                                    >
                                        View Query
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedQuery && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedQuery(null)}>
                    <div className="modal-content" style={{
                        background: '#1a1a1a', border: '1px solid #333', borderRadius: 16,
                        padding: 32, width: '90%', maxWidth: 500, color: 'white'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                            <div>
                                <h3 style={{ margin: 0, marginBottom: 4 }}>{selectedQuery.category}</h3>
                                <span className={`badge badge-${selectedQuery.status === 'resolved' ? 'success' : 'warning'}`}>{selectedQuery.status}</span>
                            </div>
                            <button onClick={() => setSelectedQuery(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Your Query</div>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 8, lineHeight: 1.5,
                                maxHeight: 200, overflowY: 'auto'
                            }}>
                                {selectedQuery.message}
                            </div>
                        </div>

                        {selectedQuery.reply ? (
                            <div>
                                <div style={{ fontSize: 12, color: '#34d399', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Admin Response</div>
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 8, lineHeight: 1.5, color: '#d1fae5',
                                    maxHeight: 200, overflowY: 'auto'
                                }}>
                                    {selectedQuery.reply}
                                </div>
                                <div style={{ fontSize: 12, color: '#666', marginTop: 8, textAlign: 'right' }}>
                                    Resolved at: {selectedQuery.resolvedAt?.toDate?.().toLocaleString()}
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontStyle: 'italic', color: '#666', textAlign: 'center', padding: 20 }}>
                                Awaiting response from support team...
                            </div>
                        )}

                        <div style={{ marginTop: 32, textAlign: 'right' }}>
                            <button
                                onClick={() => setSelectedQuery(null)}
                                style={{
                                    background: 'white', color: 'black', border: 'none',
                                    padding: '10px 24px', borderRadius: 24, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
