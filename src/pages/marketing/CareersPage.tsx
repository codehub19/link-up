import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function CareersPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10" style={{ paddingTop: '160px', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
                {/* Hero Section */}
                <div style={{ maxWidth: '896px', margin: '0 auto', padding: '0 24px', textAlign: 'center', marginBottom: '80px' }}>
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '999px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#fb7185', fontSize: '14px', fontWeight: '500', marginBottom: '24px' }}>
                        We are Hiring
                    </span>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'white', marginBottom: '24px', lineHeight: '1.2' }}>
                        Build the future of <br />
                        <span style={{ color: '#fb7185' }}>Connection</span>
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#d1d5db', maxWidth: '672px', margin: '0 auto', lineHeight: '1.6' }}>
                        We're a team of students from IIT Delhi fixing modern dating. Join us in building a platform where intention meets innovation.
                    </p>
                </div>

                {/* Cultural Values Grid - Using Flex for safety over Grid without media queries */}
                <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 24px', marginBottom: '96px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>

                    {/* Card 1 */}
                    <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚀</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>High Impact</h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>Your work will directly affect how thousands of students connect. No busy work, just shipping.</p>
                    </div>

                    {/* Card 2 */}
                    <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎓</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Student First</h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>Built by students, for students. We understand the burnout and we're here to solve it.</p>
                    </div>

                    {/* Card 3 */}
                    <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '16px' }}>💡</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Innovation</h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>We don't follow the status quo. We experiment, break things, and build something better.</p>
                    </div>
                </div>

                {/* Open Positions - Styled Job Card */}
                <div style={{ maxWidth: '896px', margin: '0 auto', padding: '0 24px' }}>
                    <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '32px', textAlign: 'center' }}>Open Positions</h2>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '32px' }}>
                            {/* Job Header */}
                            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Business Development Intern</h3>
                                        <span style={{ padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', fontSize: '12px', fontWeight: 'bold' }}>INTERNSHIP</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: '#9ca3af' }}>
                                        <span>📍 Hybrid / Remote</span>
                                        <span>⏱️ 1 Month</span>
                                        <span>💰 Stipend: Up to ₹5k</span>
                                    </div>
                                </div>
                                <Link to="/careers/apply" style={{ padding: '12px 24px', backgroundColor: '#e11d48', color: 'white', fontWeight: 'bold', borderRadius: '12px', textDecoration: 'none', display: 'inline-block' }}>
                                    Apply Now
                                </Link>
                            </div>

                            <p style={{ color: '#d1d5db', marginBottom: '32px', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                                We are looking for hungry, energetic students to help us grow DateU's presence on campus. If you are good at talking to people, organizing events, and hustling, this is for you. Open to students from <strong>any degree</strong>.
                            </p>

                            {/* Job Details Grid */}
                            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '48px' }}>
                                <div style={{ flex: '1 1 300px' }}>
                                    <h4 style={{ color: 'white', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></span>
                                        What you'll do
                                    </h4>
                                    <ul style={{ color: '#9ca3af', fontSize: '14px', listStyle: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '12px' }}>✓ Drive user acquisition strategies on your campus.</li>
                                        <li style={{ marginBottom: '12px' }}>✓ Build partnerships with college clubs and fests.</li>
                                        <li style={{ marginBottom: '12px' }}>✓ Gain hands-on experience in high-growth startup ops.</li>
                                    </ul>
                                </div>
                                <div style={{ flex: '1 1 300px' }}>
                                    <h4 style={{ color: 'white', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span>
                                        Perks & Benefits
                                    </h4>
                                    <ul style={{ color: '#9ca3af', fontSize: '14px', listStyle: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '12px' }}>🎁 Performance based stipend up to ₹5,000.</li>
                                        <li style={{ marginBottom: '12px' }}>📜 Official Internship Completion Certificate.</li>
                                        <li style={{ marginBottom: '12px' }}>🚀 Direct mentorship from the founders.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', textAlign: 'center' }}>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                            Don't see a role for you? <a href="mailto:officialdateu@gmail.com" style={{ color: '#fb7185', textDecoration: 'underline' }}>Email us</a> anyway. We hire for hunger, not just skills.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
