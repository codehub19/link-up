import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function ContactPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-6">
                    <h1 className="text-5xl font-bold mb-8 text-white text-center">Contact Us</h1>

                    <div className="grid md:grid-cols-2 gap-12 mt-12">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6">Get in touch</h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Have a question about DateU? Creating a safe and fun environment is our top priority. We're here to help.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">📧</span>
                                    <div>
                                        <h4 className="text-white font-medium">Support</h4>
                                        <a href="mailto:support@dateu.com" className="text-rose-400 hover:text-rose-300">support@dateu.com</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">👮</span>
                                    <div>
                                        <h4 className="text-white font-medium">Safety & Legal</h4>
                                        <a href="mailto:legal@dateu.com" className="text-rose-400 hover:text-rose-300">legal@dateu.com</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">💼</span>
                                    <div>
                                        <h4 className="text-white font-medium">Partnerships</h4>
                                        <a href="mailto:partners@dateu.com" className="text-rose-400 hover:text-rose-300">partners@dateu.com</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                <input type="text" className="w-full bg-zinc-900/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500" placeholder="Your name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input type="email" className="w-full bg-zinc-900/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500" placeholder="you@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                                <textarea className="w-full bg-zinc-900/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 h-32" placeholder="How can we help?"></textarea>
                            </div>
                            <button type="button" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-colors">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
