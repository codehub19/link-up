import React from "react";
import { PageWrapper } from "./AppLayout";

export default function About() {
  return (
    <PageWrapper title="About Us">
      <p className="text-xl text-gray-300 mb-8 leading-relaxed">
        Welcome to DateU, a place where new connections begin.
      </p>

      <div className="space-y-12">
        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
          <p className="text-gray-400 leading-relaxed">
            Our mission is simple: to create a safe, welcoming, and user-friendly platform that helps people find meaningful relationships, whether it's friendship, companionship, or love. We believe dating should be about quality, not quantity.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Our Story</h3>
          <p className="text-gray-400 leading-relaxed">
            DateU started as a project to solve a simple problem: the burnout of endless swiping. We wanted to build a space where intention matters. Driven by passion and the feedback of our student community, we're building the future of dating.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-white mb-4">What We Stand For</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">✨</div>
              <strong className="block text-white mb-2">Authenticity</strong>
              <p className="text-sm text-gray-500">We encourage our users to be their true selves. No filters needed.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🤝</div>
              <strong className="block text-white mb-2">Respect</strong>
              <p className="text-sm text-gray-500">Our community is built on a foundation of mutual respect and kindness.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🎯</div>
              <strong className="block text-white mb-2">Simplicity</strong>
              <p className="text-sm text-gray-500">We've designed our platform to be intuitive. Less noise, more connection.</p>
            </div>
          </div>
        </section>

        <p className="text-center text-gray-500 italic mt-12">Thank you for joining us on this journey. We're excited to have you as part of our growing community.</p>
      </div>
    </PageWrapper>
  );
}