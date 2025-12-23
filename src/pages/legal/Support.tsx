import React from "react";
import { PageWrapper } from "./AppLayout";

export default function Support() {
  return (
    <PageWrapper title="Support Center">
      <p className="text-gray-300 mb-8">
        Welcome to the DateU Support Center. We're here to help you with any questions or issues you may have.
      </p>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-400">
          <li>How do I create a profile?</li>
          <li>How can I edit my profile information?</li>
          <li>How do I report a user?</li>
          <li>I forgot my password. How can I reset it?</li>
        </ul>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Contact Us</h3>
        <p className="text-gray-400 mb-4 text-sm">
          If you can't find the answer you're looking for, please email us. Include your account email and a detailed description of your issue.
        </p>
        <div className="flex items-center gap-2 text-rose-400 font-medium">
          <span>📧</span>
          <a href="mailto:officialdateu@gmail.com" className="hover:underline">officialdateu@gmail.com</a>
        </div>
        <p className="text-xs text-gray-500 mt-4">We aim to respond to all inquiries within 48-72 business hours.</p>
      </div>
    </PageWrapper>
  );
}