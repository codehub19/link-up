import React from "react";
import { PageWrapper } from "./AppLayout";

export default function Pricing() {
  return (
    <PageWrapper title="Our Pricing Philosophy">
      <p className="text-gray-300 mb-8 leading-relaxed">
        Our mission is to help you connect with new people and build meaningful relationships in a safe and balanced community. To support this, we've adopted a pricing model designed to encourage genuine interactions.
      </p>

      <div className="grid gap-6">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-rose-400 mb-2">For Women: Completely Free Access</h3>
          <p className="text-gray-300 text-sm leading-relaxed">We believe in creating a welcoming environment for everyone. For all female users, DateU is <strong>completely free to use</strong>. This includes unlimited access to all features, including profile creation, browsing, and messaging. There are no hidden costs or subscriptions for women.</p>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-violet-400 mb-2">For Men: A Small One-Time Fee</h3>
          <p className="text-gray-300 text-sm leading-relaxed">To help ensure a community of genuine and serious users, we require male users to pay a minimal, one-time entry fee. This helps us reduce spam and foster higher-quality connections for everyone. This is not a recurring subscription. Once the one-time fee is paid, you have full access to all core features.</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-2">Future Changes</h3>
        <p className="text-gray-400 text-sm">As we grow, we may introduce optional premium subscriptions for all users. We believe in complete transparency and will give you ample notice before any changes are made.</p>
      </div>
    </PageWrapper>
  );
}