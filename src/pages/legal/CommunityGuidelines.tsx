import React from "react";
import { PageWrapper } from "./AppLayout";

export default function CommunityGuidelines() {
  return (
    <PageWrapper title="Community Guidelines">
      <p className="text-xl text-gray-300 mb-8 leading-relaxed">
        Welcome to the DateU community! We've created these guidelines to ensure everyone has a safe, respectful, and positive experience. Violations can lead to content removal or account suspension.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">1. Be Respectful</h3>
          <p className="text-gray-400 mb-6">Treat others as you would like to be treated. We have a zero-tolerance policy for harassment, bullying, hate speech, threats, or any form of intimidation.</p>

          <h3 className="text-xl font-bold text-white mb-2">2. Be Authentic</h3>
          <p className="text-gray-400 mb-6">Your profile should be a true representation of you. Do not impersonate others, use fake photos, or misrepresent your age or identity.</p>

          <h3 className="text-xl font-bold text-white mb-2">3. Keep it Clean</h3>
          <p className="text-gray-400 mb-6">Nudity, sexually explicit content, and graphic violence are not allowed. This applies to your profile photos, messages, and any other content.</p>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-2">4. No Illegal Activity</h3>
          <p className="text-gray-400 mb-6">Do not use DateU to conduct any illegal activities, including but not limited to selling drugs, soliciting prostitution, or engaging in fraud.</p>

          <h3 className="text-xl font-bold text-white mb-2">5. No Spam</h3>
          <p className="text-gray-400 mb-6">Do not use our platform for commercial solicitation, sending unsolicited messages (spam), or promoting external websites or services.</p>

          <h3 className="text-xl font-bold text-white mb-2">6. Report, Don't Retaliate</h3>
          <p className="text-gray-400 mb-6">If you encounter a user who is violating these guidelines, please use the "Report" feature. Do not engage in retaliatory behavior.</p>
        </div>
      </div>

      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 mt-8 text-center">
        <p className="text-rose-200 font-medium">
          By using DateU, you agree to these guidelines and our Terms and Conditions. Let's work together to build a great community.
        </p>
      </div>
    </PageWrapper>
  );
}