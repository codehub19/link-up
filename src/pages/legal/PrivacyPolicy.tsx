import React from "react";
import { PageWrapper } from "./AppLayout";

export default function PrivacyPolicy() {
  return (
    <PageWrapper title="Privacy Policy">
      <p className="text-sm text-gray-500 mb-6 font-mono">Last Updated: October 9, 2025</p>
      <p className="text-gray-300 mb-8 leading-relaxed">This Privacy Policy describes how DateU ("we," "us," or "our") collects, uses, and discloses your information when you use our website and services. Your privacy is of utmost importance to us.</p>

      <div className="space-y-8">
        <section>
          <h3 className="text-xl font-bold text-white mb-3">1. Introduction & Consent</h3>
          <p className="text-gray-400">
            By accessing or using DateU, you expressly consent to our collection, storage, use, and disclosure of your personal information (including Sensitive Personal Data or Information) in accordance with this Privacy Policy and the Information Technology Act, 2000 legislation. If you do not agree, strictly do not use our platform.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">2. Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li><strong className="text-gray-200">Personal Information:</strong> Name, gender, date of birth, email, phone number, and college/university details.</li>
            <li><strong className="text-gray-200">Sensitive Personal Data:</strong> College ID documents (for verification), passwords (encrypted), and facial data (if used for verification). We collect this solely for identity verification and safety purposes.</li>
            <li><strong className="text-gray-200">Device & Usage Data:</strong> IP address, device ID, location data, and logs as required by Indian cyber security laws.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">3. How We Use and Disclose Information</h3>
          <p className="text-gray-400">
            We use your data to provide matching services and ensure community safety. We generally do not share your data with third parties, EXCEPT:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
            <li><strong>Legal Requirements:</strong> We will disclose your information to Indian law enforcement agencies or courts without your consent if required by a valid legal order, investigation, or to prevent a crime.</li>
            <li><strong>Service Providers:</strong> We share data with verified partners (e.g., cloud hosting, OTP services) bound by confidentiality agreements.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">4. Data Security</h3>
          <p className="text-gray-400">
            We implement "Reasonable Security Practices" as mandated by the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. However, no digital platform is 100% secure. You acknowledge that you provide your information at your own risk.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">5. Your Rights</h3>
          <p className="text-gray-400">
            You may review, correct, or withdraw your consent for future data collection by deleting your account. Note that we may retain certain data for a statutory period as required by Indian law even after deletion.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">6. Grievance Officer</h3>
          <p className="text-gray-400">
            In accordance with the Information Technology Act 2000, if you have any grievances regarding your data, please contact our Grievance Officer:
            <br /><br />
            <strong>Grievance Officer:</strong> Legal Team
            <br />
            <strong>Email:</strong> <a href="mailto:officialdateu@gmail.com" className="text-rose-400 hover:text-rose-300">officialdateu@gmail.com</a>
            <br />
            <strong>Subject:</strong> Privacy Grievance
          </p>
        </section>
      </div>
    </PageWrapper>
  );
}