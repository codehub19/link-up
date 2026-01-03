import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function DownloadPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 flex items-center" style={{ minHeight: '80vh', paddingTop: '160px', paddingBottom: '80px' }}>
                <div className="container max-w-4xl mx-auto px-6 text-center">
                    <h1 className="font-bold mb-8 text-white" style={{ fontSize: '3.75rem' }}>
                        Get <span className="text-rose-500">DateU</span> App
                    </h1>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto mb-12 backdrop-blur-md">
                        <div className="text-6xl mb-6">📲</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Install the Web App</h2>
                        <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                            DateU is currently available as a progressive web app. You can install it directly on your phone for a full app-like experience.
                        </p>
                        <div className="inline-block bg-rose-500/20 border border-rose-500/50 rounded-xl px-6 py-4 text-rose-300 font-medium">
                            👆 Click the <strong>"Install App"</strong> button in the top navigation bar to download it now!
                        </div>
                    </div>

                    <div className="opacity-50 pointer-events-none grayscale">
                        <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest font-semibold">Coming Soon to Stores</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 text-zinc-900 rounded-xl font-bold text-lg">
                                <span className="text-2xl"></span>
                                <div className="text-left leading-tight">
                                    <span className="block text-xs font-medium opacity-70">Download on the</span>
                                    App Store
                                </div>
                            </button>

                            <button className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-zinc-700 text-white rounded-xl font-bold text-lg">
                                <span className="text-2xl">🤖</span>
                                <div className="text-left leading-tight">
                                    <span className="block text-xs font-medium opacity-70">GET IT ON</span>
                                    Google Play
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
