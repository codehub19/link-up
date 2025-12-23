import React from "react";
import { PageWrapper } from "./AppLayout";

export default function TermsOfService() {
    return (
        <PageWrapper title="Terms of Service">
            <p className="text-sm text-gray-500 mb-6 font-mono">Last Updated: October 2025</p>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Please read these Terms of Service carefully ("Terms", "Terms of Service") before using the DateU website and mobile application (the "Service") operated by DateU ("us", "we", or "our").
            </p>

            <div className="space-y-10">
                <section>
                    <h3 className="text-xl font-bold text-white mb-4">1. Accounts</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                        When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>You are responsible for safeguarding the password that you use to access the Service.</li>
                        <li>You agree not to disclose your password to any third party.</li>
                        <li>You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">2. Intellectual Property</h3>
                    <p className="text-gray-400 leading-relaxed">
                        The Service and its original content, features, and functionality are and will remain the exclusive property of DateU and its licensors.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">3. Links To Other Web Sites</h3>
                    <p className="text-gray-400 leading-relaxed">
                        Our Service may contain links to third-party web sites or services that are not owned or controlled by DateU. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third party web sites or services.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">4. Termination</h3>
                    <p className="text-gray-400 leading-relaxed">
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">5. Governing Law</h3>
                    <p className="text-gray-400 leading-relaxed">
                        These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">6. Changes</h3>
                    <p className="text-gray-400 leading-relaxed">
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect.
                    </p>
                </section>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-12 text-center text-sm text-gray-500">
                    By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
                </div>
            </div>
        </PageWrapper>
    );
}
