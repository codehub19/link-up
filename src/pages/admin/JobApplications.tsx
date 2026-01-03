import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, orderBy, query, doc, updateDoc, addDoc } from 'firebase/firestore';

export default function JobApplications() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Certificate Modal State
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
    const [certDetails, setCertDetails] = useState({
        name: '',
        role: 'Business Development Intern',
        startDate: '',
        endDate: '',
    });
    const [generatedCertId, setGeneratedCertId] = useState<string | null>(null);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'job_applications'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching applications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const markAsViewed = async (id: string, currentStatus: string) => {
        if (currentStatus === 'viewed') return;
        try {
            await updateDoc(doc(db, 'job_applications', id), { status: 'viewed' });
            // Optimistic update
            setApplications(prev => prev.map(app => app.id === id ? { ...app, status: 'viewed' } : app));
        } catch (error) {
            console.error("Error updating status", error);
        }
    }

    const openCertModal = (app: any) => {
        setSelectedApplicant(app);
        setCertDetails({
            name: app.name,
            role: 'Business Development Intern',
            startDate: '',
            endDate: new Date().toISOString().split('T')[0]
        });
        setGeneratedCertId(null);
        setIsCertModalOpen(true);
    }

    const handleIssueCertificate = async () => {
        if (!selectedApplicant || !certDetails.startDate || !certDetails.endDate) return alert("Please fill all dates.");

        try {
            const certRef = await addDoc(collection(db, 'certificates'), {
                name: certDetails.name,
                role: certDetails.role,
                startDate: certDetails.startDate,
                endDate: certDetails.endDate,
                issueDate: new Date().toISOString(),
                applicantId: selectedApplicant.id,
                email: selectedApplicant.email
            });
            setGeneratedCertId(certRef.id);
        } catch (error) {
            console.error("Error issuing certificate", error);
            alert("Failed to issue certificate");
        }
    }

    return (
        <div style={{ padding: '24px' }}>
            <h1 className="admin-page-title">Job Applications</h1>

            {loading ? (
                <div style={{ color: '#aaa' }}>Loading applications...</div>
            ) : (
                <div className="admin-card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--admin-border)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', color: '#888' }}>Date</th>
                                <th style={{ padding: '12px', color: '#888' }}>Name</th>
                                <th style={{ padding: '12px', color: '#888' }}>Role</th>
                                <th style={{ padding: '12px', color: '#888' }}>Email / Phone</th>
                                <th style={{ padding: '12px', color: '#888' }}>College</th>
                                <th style={{ padding: '12px', color: '#888' }}>Resume</th>
                                <th style={{ padding: '12px', color: '#888' }}>Why Fit?</th>
                                <th style={{ padding: '12px', color: '#888' }}>Status</th>
                                <th style={{ padding: '12px', color: '#888' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                    <td style={{ padding: '12px', color: '#ccc', fontSize: '13px' }}>
                                        {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{app.name}</td>
                                    <td style={{ padding: '12px', fontSize: '13px', color: '#aaa' }}>{app.role}</td>
                                    <td style={{ padding: '12px', fontSize: '13px' }}>
                                        <div>{app.email}</div>
                                        <div style={{ color: '#888' }}>{app.phone}</div>
                                    </td>
                                    <td style={{ padding: '12px' }}>{app.college}</td>
                                    <td style={{ padding: '12px' }}>
                                        <a href={app.resumeLink} target="_blank" rel="noopener noreferrer" style={{ color: '#fb7185', textDecoration: 'underline' }}>
                                            View Resume
                                        </a>
                                        {app.linkedin && (
                                            <div style={{ marginTop: '4px' }}>
                                                <a href={app.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', fontSize: '12px' }}>
                                                    LinkedIn
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '12px', color: '#bbb', maxWidth: '200px' }}>
                                        {app.whyFit}
                                    </td>
                                    <td style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button
                                            onClick={() => markAsViewed(app.id, app.status)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                backgroundColor: app.status === 'new' ? '#f43f5e' : '#333',
                                                color: app.status === 'new' ? 'white' : '#888'
                                            }}
                                        >
                                            {app.status === 'new' ? 'Mark Viewed' : 'Viewed'}
                                        </button>
                                        <button
                                            onClick={() => openCertModal(app)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                backgroundColor: '#0ea5e9',
                                                color: 'white'
                                            }}
                                        >
                                            Issue Cert
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No applications yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Issue Certificate Modal */}
            {isCertModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Issue Certificate</h3>

                        {!generatedCertId ? (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '4px', fontSize: '12px' }}>Name on Certificate</label>
                                    <input
                                        type="text"
                                        value={certDetails.name}
                                        onChange={(e) => setCertDetails({ ...certDetails, name: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#374151', border: 'none', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '4px', fontSize: '12px' }}>Role</label>
                                    <input
                                        type="text"
                                        value={certDetails.role}
                                        onChange={(e) => setCertDetails({ ...certDetails, role: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#374151', border: 'none', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#9ca3af', marginBottom: '4px', fontSize: '12px' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={certDetails.startDate}
                                            onChange={(e) => setCertDetails({ ...certDetails, startDate: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#374151', border: 'none', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#9ca3af', marginBottom: '4px', fontSize: '12px' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={certDetails.endDate}
                                            onChange={(e) => setCertDetails({ ...certDetails, endDate: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#374151', border: 'none', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setIsCertModalOpen(false)}
                                        style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleIssueCertificate}
                                        style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#e11d48', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Generate
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <p style={{ color: 'white', marginBottom: '8px' }}>Certificate Generated!</p>
                                <div style={{ backgroundColor: '#374151', padding: '12px', borderRadius: '6px', marginBottom: '16px', wordBreak: 'break-all', fontSize: '12px' }}>
                                    {window.location.origin}/certificate/{generatedCertId}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/certificate/${generatedCertId}`);
                                        alert("Copied!");
                                    }}
                                    style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '8px', width: '100%' }}
                                >
                                    Copy Link
                                </button>
                                <button
                                    onClick={() => setIsCertModalOpen(false)}
                                    style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
