import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function JobApplicationPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        college: '',
        linkedin: '',
        resumeLink: '',
        whyFit: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, 'job_applications'), {
                ...formData,
                role: 'Business Development Intern',
                status: 'new',
                createdAt: serverTimestamp(),
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/careers');
            }, 3000); // Redirect after 3 seconds
        } catch (error) {
            console.error("Error submitting application", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <>
                <HomeBackground />
                <Navbar />
                <main className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-md max-w-lg w-full">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Application Received!</h2>
                        <p className="text-gray-300">Thanks for applying. We'll review your application and get back to you soon.</p>
                        <p className="text-gray-500 text-sm mt-4">Redirecting you back to careers...</p>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10" style={{ paddingTop: '160px', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Apply for Internship</h1>
                        <p style={{ color: '#d1d5db' }}>Business Development Intern • Hybrid • 1 Month</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Full Name *</label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                type="text"
                                placeholder="Your Name"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Email Address *</label>
                            <input
                                required
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Phone Number *</label>
                            <input
                                required
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>College / University *</label>
                            <input
                                required
                                name="college"
                                type="text"
                                value={formData.college}
                                onChange={handleChange}
                                placeholder="IIT Delhi"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>LinkedIn Profile (Optional)</label>
                            <input
                                name="linkedin"
                                type="url"
                                value={formData.linkedin}
                                onChange={handleChange}
                                placeholder="https://linkedin.com/in/..."
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Resume / Portfolio Link *</label>
                            <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Please provide a Google Drive, Dropbox, or Portfolio link. Ensure it is publicly accessible.</p>
                            <input
                                required
                                name="resumeLink"
                                type="url"
                                value={formData.resumeLink}
                                onChange={handleChange}
                                placeholder="https://drive.google.com/..."
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Why should we hire you? *</label>
                            <textarea
                                required
                                name="whyFit"
                                value={formData.whyFit}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Tell us about yourself and why you'd be a great fit for DateU..."
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', resize: 'vertical' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: loading ? '#9f1239' : '#e11d48',
                                color: 'white',
                                fontWeight: 'bold',
                                borderRadius: '12px',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </button>

                    </form>
                </div>
            </main>
            <Footer />
        </>
    );
}
