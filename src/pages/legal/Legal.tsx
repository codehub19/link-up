import React from "react";
import { PageWrapper } from "./AppLayout";
import { Link } from "react-router-dom";
import { useSeo } from '../../utils/seo'
import { LEGAL } from '../../config/legal'

export default function Legal() {
  useSeo({ title: 'Legal', description: 'Legal information, policies and business details for DateU.', path: '/legal/legal' })
  return (
    <PageWrapper title="Legal Information">
      <p className="text-xl text-gray-300 mb-8 leading-relaxed">
        We believe in transparency. Here you can find all the legal agreements and policies that govern the use of DateU.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/legal/terms" className="group bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-xl transition-all">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">Terms of Service</h3>
          <p className="text-sm text-gray-400">
            The rules for using our platform, your rights, and our responsibilities.
          </p>
        </Link>

        <Link to="/legal/privacy" className="group bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-xl transition-all">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">Privacy Policy</h3>
          <p className="text-sm text-gray-400">
            How we collect, use, and protect your personal information.
          </p>
        </Link>

        <Link to="/legal/guidelines" className="group bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-xl transition-all">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">Community Guidelines</h3>
          <p className="text-sm text-gray-400">
            How to be a good friend on DateU and what gets you removed.
          </p>
        </Link>

        <Link to="/legal/security" className="group bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-xl transition-all">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">Security</h3>
          <p className="text-sm text-gray-400">
            Our commitment to data protection and safe verification.
          </p>
        </Link>
      </div>

      <section className="mt-10 bg-white/5 border border-white/10 rounded-xl p-6 space-y-2 text-gray-400">
        <h3 className="text-xl font-bold text-white mb-2">Business details</h3>
        <p><strong className="text-gray-200">Name:</strong> {LEGAL.businessName}</p>
        {LEGAL.udyam && <p><strong className="text-gray-200">Udyam registration:</strong> {LEGAL.udyam}</p>}
        {LEGAL.address && <p><strong className="text-gray-200">Address:</strong> {LEGAL.address}</p>}
        <p><strong className="text-gray-200">Support:</strong> <a className="text-rose-400" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a></p>
      </section>

      <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6 space-y-2 text-gray-400">
        <h3 className="text-xl font-bold text-white mb-2">Grievance Officer</h3>
        <p>
          Under the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the DPDP Act, 2023, you can raise any complaint
          about content, another member or your personal data with our Grievance Officer.
        </p>
        {LEGAL.grievance.name && <p><strong className="text-gray-200">Name:</strong> {LEGAL.grievance.name}</p>}
        <p><strong className="text-gray-200">Email:</strong> <a className="text-rose-400" href={`mailto:${LEGAL.grievance.email}`}>{LEGAL.grievance.email}</a></p>
        <p>We acknowledge complaints within {LEGAL.grievance.ackHours} hours and resolve them within {LEGAL.grievance.resolveDays} days. Urgent reports about someone's safety or intimate images are acted on within 24 hours.</p>
      </section>

      <p className="mt-8 text-sm text-gray-500 font-medium">
        These documents are legally binding. By using DateU, you agree to them.
      </p>
    </PageWrapper>
  );
}