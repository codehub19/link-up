import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function Security() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10" style={{ paddingTop: '160px', paddingBottom: '80px' }}>
                <div className="container max-w-4xl mx-auto px-6">
                    <h1 className="text-white mb-8" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Security at DateU</h1>

                    <div className="prose prose-invert max-w-none">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-rose-500">Your Safety is Our Priority</h2>
                            <p className="text-gray-300 leading-relaxed mb-6">
                                At DateU, we take the security of our community seriously. We employ state-of-the-art encryption and strict verification processes to ensure that your data and your dates are safe.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                <h3 className="text-xl font-semibold mb-3 text-white">Data Encryption</h3>
                                <p className="text-gray-400"> All personal data is encrypted in transit and at rest using industry-standard protocols.</p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                <h3 className="text-xl font-semibold mb-3 text-white">ID Verification</h3>
                                <p className="text-gray-400">All student profiles are verified against official college IDs to prevent impersonation.</p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                <h3 className="text-xl font-semibold mb-3 text-white">Privacy Controls</h3>
                                <p className="text-gray-400">You have full control over who sees your profile and how your data is shared.</p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                <h3 className="text-xl font-semibold mb-3 text-white">Active Moderation</h3>
                                <p className="text-gray-400">Our team and AI systems actively monitor for suspicious behavior to keep the platform clean.</p>
                            </div>
                        </div>

                        <div className="mt-12">
                            <h3 className="text-2xl font-semibold mb-4 text-white">Reporting Vulnerabilities</h3>
                            <p className="text-gray-300">
                                If you believe you have found a security vulnerability in DateU, please contact our security team immediately at <a href="mailto:security@dateu.com" className="text-rose-400 hover:text-rose-300">security@dateu.com</a>.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
