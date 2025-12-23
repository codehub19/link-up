import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/home/Footer/Footer";
import HomeBackground from "../../components/home/HomeBackground";

type PageWrapperProps = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export const PageWrapper = ({ title, children }: PageWrapperProps) => (
  <>
    <HomeBackground />
    <Navbar />
    <main className="relative z-10 pt-32 pb-20 min-h-screen">
      <div className="container max-w-3xl mx-auto px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">{title}</h1>
        <div className="prose prose-invert prose-lg max-w-none bg-zinc-900/50 backdrop-blur-md p-8 rounded-2xl border border-white/10">
          {children}
        </div>
      </div>
    </main>
    <Footer />
  </>
);