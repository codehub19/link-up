import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function BlogPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-6 text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6 text-white">
                        The DateU Blog
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Tips, trends, and stories from the world of modern dating.
                    </p>
                </div>

                <div className="container max-w-5xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                            <div className="aspect-video bg-zinc-800 flex items-center justify-center text-gray-600">
                                Blog Post Image
                            </div>
                            <div className="p-6">
                                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 block">Dating Tips</span>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-rose-400 transition-colors">How to make your profile stand out</h3>
                                <p className="text-sm text-gray-400 mb-4">A complete guide to photos, bios, and getting more matches in the next round.</p>
                                <span className="text-xs text-gray-500">Read more &rarr;</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </>
    );
}
