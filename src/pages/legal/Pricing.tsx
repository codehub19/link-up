import React from "react";
import { PageWrapper } from "./AppLayout";

export default function Pricing() {
  return (
    <PageWrapper title="Our Pricing Philosophy">
      <p>
        Our mission is to help you connect with new people and build meaningful relationships in a safe and balanced community. To support this, we've adopted a pricing model designed to encourage genuine interactions.
      </p>
      <div className="accent-box" style={{background: 'rgba(255,65,108,0.15)', borderColor: 'var(--brand-pink)', color: 'var(--text)'}}>
        <h3 style={{color: 'var(--brand-pink)'}}>For Women: Completely Free Access</h3>
        <p>We believe in creating a welcoming environment for everyone. For all female users, dateu.in is <strong>completely free to use</strong>. This includes unlimited access to all features, including profile creation, browsing, and messaging. There are no hidden costs or subscriptions for women.</p>
      </div>
      <div className="accent-box" style={{background: 'rgba(255,75,43,0.13)', borderColor: 'var(--brand-red)', color: 'var(--text)'}}>
        <h3 style={{color: 'var(--brand-red)'}}>For Men: A Small One-Time Fee</h3>
        <p>To help ensure a community of genuine and serious users, we require male users to pay a minimal, one-time entry fee. This helps us reduce spam and foster higher-quality connections for everyone. This is not a recurring subscription. Once the one-time fee is paid, you have full access to all core features.</p>
      </div>
      <h3>Future Changes</h3>
      <p>As we grow, we may introduce optional premium subscriptions for all users. We believe in complete transparency and will give you ample notice before any changes are made.</p>
    </PageWrapper>
  );
}