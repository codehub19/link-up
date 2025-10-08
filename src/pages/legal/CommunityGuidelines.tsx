import React from "react";
import { PageWrapper } from "./AppLayout";

export default function CommunityGuidelines() {
  return (
    <PageWrapper title="Community Guidelines">
      <p>
        Welcome to the dateu.in community! We've created these guidelines to ensure everyone has a safe, respectful, and positive experience. Please follow these rules. Violations can lead to content removal or account suspension.
      </p>
      <h3>1. Be Respectful</h3>
      <p>Treat others as you would like to be treated. We have a zero-tolerance policy for harassment, bullying, hate speech, threats, or any form of intimidation.</p>
      <h3>2. Be Authentic</h3>
      <p>Your profile should be a true representation of you. Do not impersonate others, use fake photos, or misrepresent your age or identity. We want a community of real people with genuine intentions.</p>
      <h3>3. Keep it Clean</h3>
      <p>Nudity, sexually explicit content, and graphic violence are not allowed. This applies to your profile photos, messages, and any other content you share.</p>
      <h3>4. No Illegal Activity</h3>
      <p>Do not use dateu.in to conduct any illegal activities, including but not limited to selling drugs, soliciting prostitution, or engaging in fraud.</p>
      <h3>5. No Spam or Solicitation</h3>
      <p>Do not use our platform for commercial solicitation, sending unsolicited messages (spam), or promoting external websites or services.</p>
      <h3>6. Report, Don't Retaliate</h3>
      <p>If you encounter a user who is violating these guidelines, please use the "Report" feature on their profile or contact us at <strong>officialdateu@gmail.com</strong>. Do not engage in retaliatory behavior.</p>
      <p className="text-accent" style={{marginTop: "2rem", fontWeight: "bold"}}>
        By using dateu.in, you agree to these guidelines and our Terms and Conditions. Let's work together to build a great community.
      </p>
    </PageWrapper>
  );
}