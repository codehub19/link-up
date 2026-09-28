import React from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from './AppLayout'
import { useSeo } from '../../utils/seo'
import { LEGAL } from '../../config/legal'

const Sec = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="text-xl font-bold text-white mb-3">{n}. {title}</h3>
    <div className="text-gray-400 space-y-3 leading-relaxed">{children}</div>
  </section>
)

export default function PrivacyPolicy() {
  useSeo({ title: 'Privacy Policy', description: 'How DateU collects, uses, shares and protects your personal data, and your rights under the DPDP Act, 2023.', path: '/legal/privacy' })
  const g = LEGAL.grievance
  return (
    <PageWrapper title="Privacy Policy">
      <p className="text-sm text-gray-500 mb-6 font-mono">Last updated: {LEGAL.privacyUpdated}</p>
      <p className="text-gray-300 mb-8 leading-relaxed">
        DateU is a social app that helps college students in India make new friends, find people to go to events with,
        meet people on voice calls and, if they choose, date. This policy explains what personal data we collect, why,
        who we share it with and the choices you have. It is written for the Digital Personal Data Protection Act, 2023
        (“DPDP Act”) and the Information Technology Act, 2000 and its rules.
      </p>

      <div className="space-y-8">
        <Sec n={1} title="Who we are">
          <p>
            DateU ({LEGAL.businessName}{LEGAL.udyam ? `, Udyam ${LEGAL.udyam}` : ''}{LEGAL.address ? `, ${LEGAL.address}` : ''}) is the
            “Data Fiduciary” for your data. Contact us at <a className="text-rose-400" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
          </p>
        </Sec>

        <Sec n={2} title="What we collect">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-gray-200">Account:</strong> your Google sign-in (name, email, profile photo) and, if you verify it, your phone number.</li>
            <li><strong className="text-gray-200">Profile:</strong> name, gender, date of birth (to confirm you are 18+), college, interests, bio, photos, profile prompts and, optionally, Instagram handle.</li>
            <li><strong className="text-gray-200">Dating (only if you turn it on):</strong> who you’re interested in, height, age range, relationship goals, deal breakers and answers to profile questions.</li>
            <li><strong className="text-gray-200">College ID (optional):</strong> images you upload to get a verified badge. Only our team sees them.</li>
            <li><strong className="text-gray-200">Activity:</strong> friend requests, chats and voice notes, events you join, group posts, random-call records (time, length, likes — not the audio), reports and blocks.</li>
            <li><strong className="text-gray-200">Payments:</strong> plan, amount, UPI transaction ID and the screenshot you upload. We never see your UPI PIN or bank details.</li>
            <li><strong className="text-gray-200">Device and usage:</strong> device and browser type, notification token, app events (e.g. “sent a friend request”) and crash reports, used to run and improve the app.</li>
          </ul>
          <p>Voice calls are peer-to-peer and are <strong className="text-gray-200">not recorded</strong>.</p>
        </Sec>

        <Sec n={3} title="Why we use it">
          <ul className="list-disc pl-5 space-y-2">
            <li>To run DateU: show your profile, suggest people and events, deliver messages and calls, and run matching rounds if you use dating.</li>
            <li>To keep people safe: verify ages and colleges, check photos for nudity or violence, review reports, and ban people who break our rules.</li>
            <li>To send you notifications and emails about your account (friend requests, event reminders). You can turn these off in Settings.</li>
            <li>With your separate consent only: news, events near you and tips by email. You can withdraw it any time in Settings or with the unsubscribe link.</li>
            <li>To process payments and keep the records the law requires.</li>
            <li>To fix bugs and understand which features help people make friends (analytics).</li>
          </ul>
        </Sec>

        <Sec n={4} title="What other people can see">
          <p>
            Other members can see your first name, age, photos, college, bio, interests, profile prompts and (if you turned dating on, and only to others in dating) your dating details.
            People going to the same event can see that you’re going and your note. We <strong className="text-gray-200">never show</strong> your email, phone number, Instagram, date of birth or college ID.
          </p>
          <p>You control this in Settings → Safety &amp; privacy: hide yourself from Friends, allow requests only from verified students, or be visible only to your own gender.</p>
        </Sec>

        <Sec n={5} title="Who we share it with">
          <p>We don’t sell your data. We share it only with service providers who help us run DateU, under contract:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Google Firebase / Google Cloud (hosting, database, sign-in, notifications, photo safety checks) — servers in India and elsewhere.</li>
            <li>Brevo (sending emails), Cloudflare (call relay so calls connect), PostHog (app analytics) and Sentry (crash reports).</li>
            <li>Law enforcement or courts when Indian law requires it, or to protect someone’s safety.</li>
          </ul>
        </Sec>

        <Sec n={6} title="How long we keep it">
          <ul className="list-disc pl-5 space-y-2">
            <li>Your account data: while your account is active. When you delete your account, your profile, photos, messages, friends, event sign-ups and group posts are permanently deleted within {LEGAL.deletionDays} days.</li>
            <li>Payment records (without the screenshot): as long as tax law requires (up to 8 years).</li>
            <li>Reports about other users and moderation logs: up to 1 year, to keep the community safe, or longer if needed for a legal case.</li>
          </ul>
        </Sec>

        <Sec n={7} title="Your rights">
          <p>Under the DPDP Act you can:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-gray-200">Access and correct</strong> your data — most of it in Edit profile and Settings, or by emailing us.</li>
            <li><strong className="text-gray-200">Erase</strong> it — Settings → Delete account.</li>
            <li><strong className="text-gray-200">Withdraw consent</strong> — e.g. turn off marketing emails, push or email alerts in Settings.</li>
            <li><strong className="text-gray-200">Nominate</strong> someone to exercise these rights if you are unable to.</li>
            <li><strong className="text-gray-200">Complain</strong> to our Grievance Officer (below), and if unresolved, to the Data Protection Board of India.</li>
          </ul>
        </Sec>

        <Sec n={8} title="Age">
          <p>DateU is only for people aged 18 and over. We check date of birth at sign-up and remove accounts we find belong to anyone younger.</p>
        </Sec>

        <Sec n={9} title="Security">
          <p>Data is encrypted in transit and at rest. Contact details and ID images are stored separately from your public profile and only you and our team can read them. No system is perfectly secure; if we learn of a breach affecting you, we will tell you and the Data Protection Board as the law requires.</p>
        </Sec>

        <Sec n={10} title="Grievance Officer">
          <p>
            For any complaint about your data or content on DateU, contact our Grievance Officer{g.name ? <>, <strong className="text-gray-200">{g.name}</strong></> : ''}, at{' '}
            <a className="text-rose-400" href={`mailto:${g.email}`}>{g.email}</a>. We acknowledge complaints within {g.ackHours} hours and resolve them within {g.resolveDays} days.
          </p>
        </Sec>

        <Sec n={11} title="Changes">
          <p>If we change this policy in a meaningful way we’ll tell you in the app before it applies. See also our <Link className="text-rose-400" to="/legal/terms">Terms of Service</Link>.</p>
        </Sec>
      </div>
    </PageWrapper>
  )
}
