import React from "react";
import { PageWrapper } from "./AppLayout";

export default function PrivacyPolicy() {
  return (
    <PageWrapper title="Privacy Policy">
      <p className="text-muted">Last Updated: October 9, 2025</p>
      <p>This Privacy Policy describes how dateu.in ("we," "us," or "our") collects, uses, and discloses your information when you use our website and services. Your privacy is of utmost importance to us.</p>
      <h3>1. Information We Collect</h3>
      <ul>
        <li><strong>Information You Provide:</strong> Account information (name, email, gender, DOB), profile details (photos, description), and communications.</li>
        <li><strong>Information We Collect Automatically:</strong> Usage data, device information, and cookies.</li>
      </ul>
      <h3>2. How We Use Your Information</h3>
      <p>To provide and maintain our Service, manage your account, facilitate connections, personalize your experience, communicate with you, and enforce our Terms.</p>
      <h3>3. How We Share Your Information</h3>
      <p>We do not sell your data. We share information with other users (your profile), for legal reasons if required by law, and with third-party service providers who assist us in operating the platform.</p>
      <h3>4. Data Security</h3>
      <p>We implement reasonable security measures but cannot guarantee absolute security. You provide your personal information at your own risk.</p>
      <h3>5. Your Choices and Rights</h3>
      <p>You can review, update, or delete your profile information at any time through your account settings.</p>
      <h3>6. Children's Privacy</h3>
      <p>Our Service is not for individuals under 18. We do not knowingly collect data from children.</p>
      <h3>7. Changes to This Privacy Policy</h3>
      <p>We may update this policy and will notify you by posting the new policy on this page.</p>
      <h3>8. Contact Us</h3>
      <p>If you have any questions, please contact us at: <strong>officialdateu@gmail.com</strong>.</p>
    </PageWrapper>
  );
}