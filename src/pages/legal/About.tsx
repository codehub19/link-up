import React from "react";
import { PageWrapper } from "./AppLayout";
import { useSeo } from '../../utils/seo'

export default function About() {
  useSeo({ title: 'About DateU', description: 'DateU is a social app built by students at IIT Delhi to help college students make new friends and connections — through Friends, events, voice calls and chat.', path: '/about' })
  return (
    <PageWrapper title="About Us">
      <p className="text-xl text-gray-300 mb-8 leading-relaxed">
        DateU is proudly built by a team of students from <strong>IIT Delhi</strong> who wanted meeting new people in college to be easy.
      </p>

      <div className="space-y-12">
        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
          <p className="text-gray-400 leading-relaxed">
            Our mission is simple: to make it easy for students to make new friends and connections — study buddies, people to go to fests with, and friends for life. Dating is there as an optional extra, but DateU is about socialising.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Our Story</h3>
          <p className="text-gray-400 leading-relaxed">
            It started in the dorms of IIT Delhi. We noticed how hard it is to meet people outside your own class or hostel, and how many students skip events because they have nobody to go with. So we built a place to find friends, plans and people to go with — designed by students, for students.
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