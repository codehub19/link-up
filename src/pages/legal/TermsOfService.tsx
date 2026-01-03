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
                    <h3 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h3>
                    <p className="text-gray-400 leading-relaxed">
                        By creating an account, accessing, or using the DateU application ("Service"), you agree to be bound by these Terms. If you do not agree, you must not use the Service. <strong>These Terms constitute a legally binding agreement between you and DateU.</strong>
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">2. Status as Intermediary</h3>
                    <p className="text-gray-400 leading-relaxed">
                        DateU acts solely as an "Intermediary" as defined under the Information Technology Act, 2000, and rules thereunder. We provide a platform for users to connect but do not create, publish, or endorse user-generated content. We are not responsible for the conduct of any user or the content they post.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">3. Disclaimers & No Warranties</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. DATEU EXPLICITLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                        WE DO NOT GUARANTEE THAT:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                        <li>You will find a match or partner.</li>
                        <li>The Service will be secure, error-free, or uninterrupted.</li>
                        <li>Any verification implies a guarantee of a user's identity or good conduct.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">4. Limitation of Liability</h3>
                    <p className="text-gray-400 leading-relaxed uppercase">
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW (INCLUDING INDIAN LAW), DATEU, ITS AFFILIATES, EMPLOYEES, AND DIRECTORS SHALL NOT BE LIABLE FOR ANY DAMAGES WHATSOEVER, WHETHER DIRECT, INDIRECT, GENERAL, SPECIAL, COMPENSATORY, CONSEQUENTIAL, OR INCIDENTAL, ARISING OUT OF OR RELATING TO THE CONDUCT OF YOU OR ANYONE ELSE IN CONNECTION WITH THE USE OF THE SERVICE, INCLUDING WITHOUT LIMITATION, BODILY INJURY, EMOTIONAL DISTRESS, LOSS OF DATA, OR ANY OTHER DAMAGES RESULTING FROM COMMUNICATIONS OR MEETINGS WITH OTHER USERS.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">5. Indemnification</h3>
                    <p className="text-gray-400 leading-relaxed">
                        You agree to indemnify, defend, and hold harmless DateU and its officers, directors, and employees from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">6. User Conduct & Safety</h3>
                    <p className="text-gray-400 leading-relaxed">
                        You are solely responsible for your interactions with other users. DateU conducts limited checks (like college ID verification) but does not conduct criminal background checks. You agree to take all necessary precautions when interacting with others, especially if you decide to meet in person.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-white mb-4">7. Governing Law & Dispute Resolution</h3>
                    <p className="text-gray-400 leading-relaxed">
                        These Terms shall be governed by the laws of India. Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in India.
                    </p>
                </section>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-12 text-center text-sm text-gray-500">
                    <strong>LEGAL ACKNOWLEDGEMENT:</strong> BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. YOU HEREBY WAIVE ANY RIGHT TO CLAIM THAT YOU DID NOT READ THESE TERMS.
                </div>
            </div>
        </PageWrapper>
    );
}
