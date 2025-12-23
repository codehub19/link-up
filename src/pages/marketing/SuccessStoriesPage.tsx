import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function SuccessStoriesPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-8 text-white">
                        Love on <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-400">DateU</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-16">
                        Real stories from real students who found their person (or just a really great date).
                    </p>
                </div>

                <div className="container max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
                    {/* Story 1 */}
                    <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5">
                        <div className="h-64 bg-zinc-800 flex items-center justify-center">
                            <span className="text-6xl">👩‍❤️‍👨</span>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">S</div>
                                <div>
                                    <h4 className="text-white font-bold">Sarah & Mike</h4>
                                    <p className="text-xs text-gray-400">Matched Oct 2024</p>
                                </div>
                            </div>
                            <p className="text-gray-300 italic">"We both went to the same coffee shop correctly 3 times a week and never met until DateU matched us in a Tuesday round. Been together since!"</p>
                        </div>
                    </div>

                    {/* Story 2 */}
                    <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5">
                        <div className="h-64 bg-zinc-800 flex items-center justify-center">
                            <span className="text-6xl">🎓</span>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">J</div>
                                <div>
                                    <h4 className="text-white font-bold">James & Alex</h4>
                                    <p className="text-xs text-gray-400">Matched Nov 2024</p>
                                </div>
                            </div>
                            <p className="text-gray-300 italic">"I was skeptical of dating apps, but the verification made me feel safe. Alex is exactly who his profile said he was."</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
