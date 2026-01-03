import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoadingHeart from '../../components/LoadingHeart';

export default function CertificatePage() {
    const { id } = useParams();
    const [cert, setCert] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCert = async () => {
            if (!id) return;
            try {
                const snap = await getDoc(doc(db, 'certificates', id));
                if (snap.exists()) {
                    setCert({ id: snap.id, ...snap.data() });
                }
            } catch (error) {
                console.error("Error fetching certificate", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCert();
    }, [id]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900"><LoadingHeart /></div>;
    if (!cert) return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Certificate not found.</div>;

    const handleDownload = () => {
        window.print();
    };

    return (
        <div className="bg-gray-100 min-h-screen py-8 flex flex-col items-center justify-center font-serif">

            {/* Download Button - Hidden in Print */}
            <div className="no-print mb-8">
                <button
                    onClick={handleDownload}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    Download Certificate (PDF)
                </button>
            </div>

            {/* Certificate Container */}
            <div className="certificate-container" style={{
                width: '1123px', // A4 Landscape
                height: '794px', // A4 Landscape
                backgroundColor: '#fff',
                position: 'relative',
                color: '#1f2937',
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundImage: 'radial-gradient(circle at center, #fff, #f3f4f6)'
            }}>
                {/* Guilloche Pattern Background - CSS Pattern */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage: `repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)`,
                    backgroundSize: '20px 20px'
                }} />

                {/* Ornamental Border */}
                <div style={{
                    position: 'absolute',
                    inset: '20px',
                    border: '2px solid #b45309', // Amber-700
                    pointerEvents: 'none',
                    zIndex: 5
                }} />
                <div style={{
                    position: 'absolute',
                    inset: '25px',
                    border: '4px double #78350f', // Amber-900
                    pointerEvents: 'none',
                    zIndex: 5
                }} />

                {/* Watermark */}
                <img src="/icons/icon-192.png" alt="watermark" style={{
                    position: 'absolute',
                    width: '400px',
                    opacity: 0.04,
                    filter: 'grayscale(100%)',
                    zIndex: 0
                }} />

                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '40px 80px', // Reduced top padding significantly
                    zIndex: 10
                }}>

                    {/* Header: Company Name */}
                    <div style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                fontFamily: "'Playfair Display', serif",
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                color: '#9ca3af', // Gray-400 equivalent for "DateU" logo-ish feel
                                backgroundImage: 'linear-gradient(135deg, #1f2937 0%, #4b5563 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                            }}>DateU</span>
                        </div>

                        <h1 style={{
                            fontSize: '60px', // Reduced slightly
                            fontWeight: 'normal',
                            margin: '0',
                            color: '#78350f', // Amber-900 
                            fontFamily: "'Playfair Display', serif",
                            textTransform: 'uppercase',
                            letterSpacing: '4px',
                            borderBottom: '2px solid #b45309',
                            display: 'inline-block',
                            paddingBottom: '4px',
                            lineHeight: 1
                        }}>
                            Certificate
                        </h1>
                        <h2 style={{
                            fontSize: '20px', // Reduced
                            fontWeight: '300',
                            margin: '8px 0 0',
                            color: '#4b5563',
                            textTransform: 'uppercase',
                            letterSpacing: '6px'
                        }}>
                            of Completion
                        </h2>
                    </div>

                    <p style={{ fontSize: '18px', color: '#374151', marginBottom: '16px', fontFamily: 'serif' }}>This certificate is proudly presented to</p>

                    {/* Name */}
                    <div style={{
                        margin: '0 0 24px 0',
                        minWidth: '500px',
                        textAlign: 'center',
                        borderBottom: '1px solid #d1d5db',
                        paddingBottom: '4px'
                    }}>
                        <h3 style={{
                            fontSize: '64px', // Bigger name
                            fontWeight: 'bold',
                            margin: 0,
                            color: '#111827',
                            fontFamily: "'Great Vibes', cursive",
                            lineHeight: '1.2'
                        }}>
                            {cert.name}
                        </h3>
                    </div>

                    <p style={{ fontSize: '18px', color: '#1f2937', margin: '0 0 24px 0', maxWidth: '900px', textAlign: 'center', lineHeight: '1.6' }}>
                        For successfully completing the <strong>{cert.role}</strong> Internship program at <strong>DateU</strong>. <br />
                        We recognize their dedication, hard work, and valuable contribution during the period from <br />
                        <strong>{new Date(cert.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> to <strong>{new Date(cert.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                    </p>

                    {/* Footer Section: Signatures & Seal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 'auto', paddingBottom: '20px' }}>

                        {/* Signature 1 */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontFamily: "'Great Vibes', cursive",
                                fontSize: '32px',
                                color: '#000',
                                marginBottom: '4px',
                                minWidth: '220px',
                                borderBottom: '1px solid #9ca3af',
                                paddingBottom: '4px'
                            }}>
                                The Founders
                            </div>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Founding Team</p>
                        </div>

                        {/* Gold Seal */}
                        <div style={{
                            width: '120px',
                            height: '120px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px'
                        }}>
                            {/* Outer Starburst */}
                            <div style={{
                                position: 'absolute', inset: 0, backgroundColor: '#b45309',
                                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                transform: 'rotate(0deg)'
                            }} />
                            <div style={{
                                position: 'absolute', inset: 0, backgroundColor: '#d97706',
                                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                transform: 'rotate(22.5deg)'
                            }} />

                            {/* Inner Circle */}
                            <div style={{
                                width: '86px',
                                height: '86px',
                                borderRadius: '50%',
                                border: '2px solid #fef3c7',
                                backgroundColor: '#92400e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fef3c7',
                                zIndex: 10,
                                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', lineHeight: '1.2' }}>
                                    OFFICIAL<br />CERTIFICATE<br />DATEU
                                </div>
                            </div>
                        </div>

                        {/* Date & ID */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                minWidth: '220px',
                                borderBottom: '1px solid #9ca3af',
                                paddingBottom: '12px',
                                marginBottom: '8px',
                                fontSize: '18px',
                                fontFamily: 'serif'
                            }}>
                                {new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Issue Date</p>
                            <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>ID: {cert.id.substring(0, 8).toUpperCase()}</p>
                        </div>

                    </div>

                </div>
            </div>

            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:wght@400;700&display=swap');

                    @media print {
                        @page { size: landscape; margin: 0; }
                        body { margin: 0; background-color: white !important; -webkit-print-color-adjust: exact; }
                        .no-print { display: none !important; }
                        .certificate-container { 
                            width: 100% !important; 
                            height: 100vh !important; 
                            box-shadow: none !important; 
                            border: none !important;
                            border-radius: 0 !important;
                            margin: 0 !important;
                            page-break-after: always;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                `}
            </style>
        </div>
    );
}
