import React from "react";
import { PageWrapper } from "./AppLayout";

export default function PrivacyPolicy() {
  return (
    <PageWrapper title="Privacy Policy">
      <p className="text-sm text-gray-500 mb-6 font-mono">Last Updated: October 9, 2025</p>
      <p className="text-gray-300 mb-8 leading-relaxed">This Privacy Policy describes how DateU ("we," "us," or "our") collects, uses, and discloses your information when you use our website and services. Your privacy is of utmost importance to us.</p>

      <div className="space-y-8">
        <section>
          <h3 className="text-xl font-bold text-white mb-3">1. Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li><strong className="text-gray-200">Information You Provide:</strong> Account information (name, email, gender, DOB), profile details (photos, description), and communications.</li>
            <li><strong className="text-gray-200">Information We Collect Automatically:</strong> Usage data, device information, and cookies.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h3>
          <p className="text-gray-400">To provide and maintain our Service, manage your account, facilitate connections, personalize your experience, communicate with you, and enforce our Terms.</p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">3. How We Share Your Information</h3>
          <p className="text-gray-400">We do not sell your data. We share information with other users (your profile), for legal reasons if required by law, and with third-party service providers who assist us in operating the platform.</p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">4. Data Security</h3>
          <p className="text-gray-400">We implement reasonable security measures but cannot guarantee absolute security. You provide your personal information at your own risk.</p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">5. Contact Us</h3>
          <p className="text-gray-400">If you have any questions, please contact us at: <a href="mailto:officialdateu@gmail.com" className="text-rose-400 hover:text-rose-300">officialdateu@gmail.com</a>.</p>
        </section>
      </div>
    </PageWrapper>
  );
}