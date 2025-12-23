import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function DownloadPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20 min-h-[80vh] flex items-center">
                <div className="container max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 text-white">
                        Get <span className="text-rose-500">DateU</span> App
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
                        The full experience is even better on mobile. Get push notifications for rounds and chat on the go.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl transition-all font-bold text-lg">
                            <span className="text-2xl"></span>
                            <div className="text-left leading-tight">
                                <span className="block text-xs font-medium opacity-70">Download on the</span>
                                App Store
                            </div>
                        </button>

                        <button className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-white rounded-xl transition-all font-bold text-lg">
                            <span className="text-2xl">🤖</span>
                            <div className="text-left leading-tight">
                                <span className="block text-xs font-medium opacity-70">GET IT ON</span>
                                Google Play
                            </div>
                        </button>
                    </div>

                    <p className="mt-8 text-sm text-gray-500">Coming soon to stores near you. Use the web app for now!</p>
                </div>
            </main>
            <Footer />
        </>
    );
}
