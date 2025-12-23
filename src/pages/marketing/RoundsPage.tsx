import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';
import { Link } from 'react-router-dom';

export default function RoundsPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-6 text-center">
                    <span className="inline-block py-1 px-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-6">
                        How It Works
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 text-white tracking-tight">
                        The Magic of <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-400">Rounds</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Stop swiping endlessly. DateU matches happen in "Rounds"—scheduled events where everyone is online at once.
                    </p>
                </div>

                <div className="container max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl">1</div>
                            <h3 className="text-2xl font-bold mb-4 text-white">Join the Queue</h3>
                            <p className="text-gray-400">Sign up for the next round. You'll get notified when it starts. No more ghost towns.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-violet-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl">2</div>
                            <h3 className="text-2xl font-bold mb-4 text-white">Get Curated Matches</h3>
                            <p className="text-gray-400">Our algorithm finds your best potential connections based on your preferences and dealbreakers.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl">3</div>
                            <h3 className="text-2xl font-bold mb-4 text-white">Live Chat</h3>
                            <p className="text-gray-400">You have a limited time to chat. If the vibe is right, take it offline. If not, wait for the next round.</p>
                        </div>
                    </div>

                    <div className="mt-20 text-center">
                        <Link to="/setup/profile" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all bg-rose-600 rounded-full hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/25">
                            Start Your First Round
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
