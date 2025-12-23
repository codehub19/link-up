import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/home/Footer/Footer';
import HomeBackground from '../../components/home/HomeBackground';

export default function CareersPage() {
    return (
        <>
            <HomeBackground />
            <Navbar />
            <main className="relative z-10 pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-6 text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6 text-white">
                        Join the team
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        We're building the future of digital connection. We're looking for passionate people to help us fix dating for everyone.
                    </p>
                </div>

                <div className="container max-w-3xl mx-auto px-6">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">No Open Roles</h3>
                        <p className="text-gray-400 mb-6">
                            We aren't actively hiring right now, but we're always happy to hear from talented people.
                        </p>
                        <a href="mailto:careers@dateu.com" className="text-rose-400 hover:text-rose-300 font-medium">
                            Send us your resume &rarr;
                        </a>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
