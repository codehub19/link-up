import React from "react";
import { PageWrapper } from "./AppLayout";
import { Link } from "react-router-dom";

export default function Legal() {
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
            Code of conduct for a safe and respectful dating environment.
          </p>
        </Link>

        <Link to="/legal/security" className="group bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-xl transition-all">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">Security</h3>
          <p className="text-sm text-gray-400">
            Our commitment to data protection and safe verification.
          </p>
        </Link>
      </div>

      <p className="mt-8 text-sm text-gray-500 font-medium">
        These documents are legally binding. By using DateU, you agree to them.
      </p>
    </PageWrapper>
  );
}