import React from "react";
import { PageWrapper } from "./AppLayout";

export default function Support() {
  return (
    <PageWrapper title="Support Center">
      <p>
        Welcome to the dateu.in Support Center. We're here to help you with any questions or issues you may have.
      </p>
      <h3>Frequently Asked Questions (FAQs)</h3>
      <ul>
        <li>How do I create a profile?</li>
        <li>How can I edit my profile information?</li>
        <li>How do I report a user?</li>
        <li>I forgot my password. How can I reset it?</li>
      </ul>
      <h3>Contact Us</h3>
      <p>
        If you can't find the answer you're looking for, please email us. When you contact us, please include the email address associated with your account and a detailed description of your issue.
      </p>
      <p><strong>Email:</strong> officialdateu@gmail.com</p>
      <p className="text-muted">We aim to respond to all inquiries within 48-72 business hours. We appreciate your patience.</p>
    </PageWrapper>
  );
}